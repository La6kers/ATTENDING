/**
 * ATTENDING AI - Auth Token Bridge
 * 
 * Bridges NextAuth session tokens to the .NET backend API client.
 * Ensures the API client and SignalR notification client always
 * have the current JWT for authenticated requests.
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from './backendClient';
import notificationClient from './notificationClient';

/**
 * Hook that syncs the NextAuth access token to the backend API client
 * and SignalR notification client. Place this once in _app.tsx.
 * 
 * In development with DevBypass, no token is needed — the .NET backend
 * auto-authenticates all requests via DevAuthHandler.
 */
export function useAuthTokenBridge() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    // In dev mode, the .NET backend uses DevBypass (no JWT needed)
    // but we still set whatever token NextAuth provides
    const token = (session as any)?.accessToken || null;

    apiClient.setAccessToken(token);
    notificationClient.setAccessToken(token);

    // If authenticated and we have a token, ensure notification client connects
    if (session?.user && token) {
      notificationClient.connect().catch((err) => {
        console.warn('[AuthBridge] SignalR connection failed (will retry):', err.message);
      });
    }
  }, [session, status]);

  return {
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    user: session?.user ?? null,
  };
}

/**
 * Set the API token imperatively (for non-React contexts like SSR/API routes)
 */
export function setApiToken(token: string | null) {
  apiClient.setAccessToken(token);
  notificationClient.setAccessToken(token);
}

export default useAuthTokenBridge;
