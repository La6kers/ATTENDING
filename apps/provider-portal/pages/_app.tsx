// ============================================================
// Provider Portal - App Entry Point
// apps/provider-portal/pages/_app.tsx
//
// Initializes:
// - NextAuth SessionProvider for authentication
// - WebSocket connection for real-time updates
// - Toast notification system
// - Floating action button
// - Notification permissions
// - Global state management
// ============================================================

import '../styles/globals.css'
// React Grid Layout CSS for resizable dashboard cards
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { AppProps } from 'next/app'
import { SessionProvider, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Navigation from '@/components/layout/Navigation'
import { useEffect, useState } from 'react'
import { 
  connectWebSocket, 
  disconnectWebSocket, 
  initializeAudio,
  requestNotificationPermission 
} from '@/lib/websocket'
import { useKeyboardShortcuts, createClinicalShortcuts } from '@/hooks/useKeyboardShortcuts'
import KeyboardShortcutsHelp from '@/components/shared/KeyboardShortcutsHelp'
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore'
import { ToastProvider, useToast, setToastFn, FloatingActionButton } from '@/components/shared'
import { EmergencyProtocolModal } from '@/components/shared'

// Pages that should not show the navigation
const noNavPages = ['/auth/signin', '/auth/error', '/login', '/error']

// Pages that don't require authentication
const publicPages = ['/auth/signin', '/auth/error', '/api']

// ============================================================
// AUTHENTICATED APP WRAPPER
// ============================================================

// Inner app component that can use toast hooks
function AppContent({ Component, pageProps }: { Component: AppProps['Component'], pageProps: any }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const fetchAssessments = useAssessmentQueueStore(state => state.fetchAssessments)
  const toastContext = useToast()

  // Get provider info from session or use dev defaults
  const providerId = session?.user?.id || 'provider-dev-001'
  const providerName = session?.user?.name || 'Dr. Provider (Dev)'

  // Initialize toast function for non-React contexts
  useEffect(() => {
    setToastFn(toastContext)
  }, [toastContext])

  // Check if current page is public
  const isPublicPage = publicPages.some(page => router.pathname.startsWith(page))

  // Redirect to login if not authenticated (and not on public page)
  useEffect(() => {
    if (status === 'loading') return
    
    // In development with bypass enabled, don't redirect
    if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') return
    
    if (!session && !isPublicPage) {
      router.push('/auth/signin')
    }
  }, [session, status, isPublicPage, router])

  // Global keyboard shortcuts
  const globalShortcuts = createClinicalShortcuts({
    onSearch: () => {
      // Focus the search input in header if available
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      } else {
        toastContext.info('Search', 'Press / to search')
      }
    },
    onEmergency: () => {
      setShowEmergencyModal(true)
    },
  })

  // Add "?" shortcut to show keyboard help
  useKeyboardShortcuts({
    shortcuts: [
      ...globalShortcuts,
      {
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts',
        action: () => setShowKeyboardHelp(true),
      },
    ],
    enabled: mounted && !showEmergencyModal,
  })

  // Initialize app on mount
  useEffect(() => {
    setMounted(true)
    
    // Initialize audio for urgent alerts
    initializeAudio()
    
    // Request notification permission
    requestNotificationPermission().then(granted => {
      if (granted) {
        console.log('[App] Notification permission granted')
      }
    })
    
    // Initial data fetch
    fetchAssessments()
  }, [fetchAssessments])

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (!mounted) return
    
    // Only connect if we have a user (session or dev mode)
    const shouldConnect = session?.user || process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'
    if (!shouldConnect) return

    // Connect to WebSocket server
    try {
      const socket = connectWebSocket(providerId, providerName)
      
      socket.on('connect', () => {
        setWsConnected(true)
        console.log('[App] WebSocket connected')
      })
      
      socket.on('disconnect', () => {
        setWsConnected(false)
        console.log('[App] WebSocket disconnected')
      })
    } catch (error) {
      console.error('[App] WebSocket connection failed:', error)
    }

    // Cleanup on unmount
    return () => {
      disconnectWebSocket()
    }
  }, [mounted, session, providerId, providerName])

  // Periodic refresh of assessments
  useEffect(() => {
    if (!mounted) return
    
    const interval = setInterval(() => {
      fetchAssessments()
    }, 30000)

    return () => clearInterval(interval)
  }, [mounted, fetchAssessments])

  // Check if current page should show navigation
  const showNav = !noNavPages.some(page => router.pathname.startsWith(page))

  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gradient">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  // Pages that should show the FAB
  const showFAB = !noNavPages.some(page => router.pathname.startsWith(page)) && 
                  router.pathname !== '/patient-assessment'

  return (
    <div className="min-h-screen">
      {/* Connection status indicator (dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-gray-900 text-white px-3 py-1.5 rounded-full text-xs shadow-lg">
          <span 
            className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} 
          />
          <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
          {session?.user && (
            <span className="border-l border-gray-600 pl-2 ml-1">
              {session.user.name}
            </span>
          )}
        </div>
      )}
      
      {showNav && <Navigation />}
      <main className={showNav ? 'pt-16' : ''}>
        <Component {...pageProps} />
      </main>

      {/* Global Floating Action Button */}
      {showFAB && (
        <FloatingActionButton
          onEmergency={() => setShowEmergencyModal(true)}
          position="bottom-right"
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Emergency Protocol Modal */}
      {showEmergencyModal && (
        <EmergencyProtocolModal
          isOpen={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          patientName="Current Patient"
        />
      )}
    </div>
  )
}

// ============================================================
// AUTHENTICATED APP WRAPPER WITH TOAST PROVIDER
// ============================================================

function AuthenticatedApp({ Component, pageProps }: { Component: AppProps['Component'], pageProps: any }) {
  return (
    <ToastProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </ToastProvider>
  )
}

// ============================================================
// MAIN APP WITH SESSION PROVIDER
// ============================================================

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <AuthenticatedApp Component={Component} pageProps={pageProps} />
    </SessionProvider>
  )
}
