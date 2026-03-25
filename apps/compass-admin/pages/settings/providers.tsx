// =============================================================================
// COMPASS Admin - Provider Management (Settings)
// apps/compass-admin/pages/settings/providers.tsx
//
// Manage providers who can view and claim assessments in the queue.
// Phase 4 — placeholder with functional layout.
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import {
  Users,
  Plus,
  Mail,
  Shield,
  UserCheck,
  Settings,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

interface Provider {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'reviewer';
  isActive: boolean;
}

// Demo data — in production, fetched from database
const DEMO_PROVIDERS: Provider[] = [
  { id: '1', name: 'Dr. Sarah Chen', email: 'sarah.chen@clinic.com', role: 'admin', isActive: true },
  { id: '2', name: 'Dr. James Patel', email: 'james.patel@clinic.com', role: 'reviewer', isActive: true },
];

export default function ProvidersPage() {
  const [providers] = useState<Provider[]>(DEMO_PROVIDERS);

  return (
    <>
      <Head>
        <title>Provider Management | COMPASS Admin</title>
      </Head>

      <CompassAdminShell title="Provider Management">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage who can view the assessment queue and claim patients.
              </p>
            </div>
            <button className="px-4 py-2.5 bg-compass-600 text-white rounded-lg font-medium hover:bg-compass-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Invite Provider
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {providers.map((provider) => (
              <div key={provider.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-compass-100 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-compass-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-3.5 h-3.5" />
                      {provider.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    provider.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Shield className="w-3 h-3 inline mr-1" />
                    {provider.role === 'admin' ? 'Admin' : 'Reviewer'}
                  </span>
                  <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Roles Explanation */}
          <div className="mt-6 bg-compass-50 rounded-xl border border-compass-200 p-5">
            <h3 className="font-semibold text-compass-800 mb-2">Role Permissions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-compass-700 mb-1">Admin</p>
                <ul className="text-compass-600 space-y-1">
                  <li>• View and claim all assessments</li>
                  <li>• Configure webhooks and settings</li>
                  <li>• Manage other providers</li>
                  <li>• Access analytics</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-compass-700 mb-1">Reviewer</p>
                <ul className="text-compass-600 space-y-1">
                  <li>• View and claim assessments</li>
                  <li>• Mark assessments as reviewed</li>
                  <li>• Export assessment data</li>
                  <li>• Cannot change settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
