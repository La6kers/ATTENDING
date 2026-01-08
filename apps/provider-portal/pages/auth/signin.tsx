// ============================================================
// Sign In Page - Provider Portal
// apps/provider-portal/pages/auth/signin.tsx
// ============================================================

import React, { useState } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Stethoscope, AlertCircle, Loader2 } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const { error, callbackUrl } = router.query;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === 'CredentialsSignin' ? 'Invalid email or password' : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: (callbackUrl as string) || '/',
      });

      if (result?.error) {
        setErrorMessage('Invalid email or password');
        setIsLoading(false);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (userType: 'provider' | 'admin' | 'nurse') => {
    setIsLoading(true);
    const emails = {
      provider: 'provider@attending.dev',
      admin: 'admin@attending.dev',
      nurse: 'nurse@attending.dev',
    };
    
    await signIn('credentials', {
      email: emails[userType],
      password: 'password',
      callbackUrl: (callbackUrl as string) || '/',
    });
  };

  return (
    <>
      <Head>
        <title>Sign In - ATTENDING Provider Portal</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Stethoscope className="h-8 w-8" />
              <h1 className="text-2xl font-bold">ATTENDING</h1>
            </div>
            <p className="text-indigo-200">Provider Portal Sign In</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="provider@clinic.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700">
                Forgot your password?
              </a>
            </div>
          </form>

          {/* Development Quick Login */}
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">
                Development Quick Login
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDevLogin('provider')}
                  disabled={isLoading}
                  className="px-3 py-2 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                >
                  Provider
                </button>
                <button
                  onClick={() => handleDevLogin('nurse')}
                  disabled={isLoading}
                  className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  Nurse
                </button>
                <button
                  onClick={() => handleDevLogin('admin')}
                  disabled={isLoading}
                  className="px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
