// ============================================================
// ATTENDING AI - Login Page
// apps/provider-portal/components/auth/LoginPage.tsx
//
// Azure AD B2C login interface with healthcare branding
// ============================================================

import React, { useState } from 'react';
import {
  Stethoscope,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (options?: { loginHint?: string }) => Promise<void>;
  onSSOLogin: (provider: 'epic' | 'oracle' | 'azure') => Promise<void>;
  onForgotPassword: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function LoginPage({
  onLogin,
  onSSOLogin,
  onForgotPassword,
  isLoading = false,
  error = null,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [showSSOOptions, setShowSSOOptions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin({ loginHint: email || undefined });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ATTENDING AI</span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Transform Patient Care<br />
            with Clinical Intelligence
          </h1>
          <p className="mt-6 text-xl text-blue-200">
            AI-powered clinical decision support that integrates seamlessly with your workflow.
          </p>

          <div className="mt-12 space-y-4">
            {[
              { icon: Shield, text: 'HIPAA Compliant & SOC 2 Certified' },
              { icon: Building2, text: 'Enterprise EHR Integration' },
              { icon: CheckCircle, text: 'Trusted by 500+ Healthcare Organizations' },
            ].map(({ icon: Icon, text }, index) => (
              <div key={index} className="flex items-center gap-3 text-blue-200">
                <Icon className="w-5 h-5" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-blue-300 text-sm">
          © 2024 ATTENDING AI. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <Stethoscope className="w-8 h-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">ATTENDING AI</span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="mt-2 text-gray-600">Sign in to access your provider portal</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* SSO Options */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => onSSOLogin('epic')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <img src="/epic-logo.svg" alt="Epic" className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="font-medium text-gray-700">Sign in with Epic</span>
              </button>

              <button
                onClick={() => onSSOLogin('oracle')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <img src="/oracle-logo.svg" alt="Oracle Health" className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="font-medium text-gray-700">Sign in with Oracle Health</span>
              </button>

              <button
                onClick={() => onSSOLogin('azure')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-700">Sign in with Organization SSO</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hospital.org"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 text-center">
              <button
                onClick={onForgotPassword}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Forgot your password?
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
              <p>
                Don't have an account?{' '}
                <a href="/contact" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Contact your administrator
                </a>
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 flex items-center justify-center gap-2 text-blue-200 text-sm">
            <Shield className="w-4 h-4" />
            <span>Protected by enterprise-grade security</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
