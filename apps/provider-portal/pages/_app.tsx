import '../styles/globals.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';

// Plug-and-Play Architecture
import { ServicesProvider } from '../../shared/hooks/useServices';
import '../../shared/services/registerServices'; // Auto-registers all services

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // Determine tier from session or environment
  const tier = (process.env.NEXT_PUBLIC_SUBSCRIPTION_TIER as 'free' | 'pro' | 'enterprise') || 'enterprise';
  const aiProvider = (process.env.NEXT_PUBLIC_AI_PROVIDER as 'biomistral' | 'openai' | 'anthropic' | 'mock') || 'mock';
  const environment = (process.env.NODE_ENV === 'production' ? 'production' : 'development') as 'development' | 'staging' | 'production';

  return (
    <SessionProvider session={session}>
      <ServicesProvider
        initialTier={tier}
        aiProvider={aiProvider}
        environment={environment}
        userId={session?.user?.id as string | undefined}
      >
        <Component {...pageProps} />
      </ServicesProvider>
    </SessionProvider>
  );
}
