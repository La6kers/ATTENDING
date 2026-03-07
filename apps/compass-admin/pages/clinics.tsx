// =============================================================================
// ATTENDING Admin - Clinic Management
// apps/compass-admin/pages/clinics.tsx
// =============================================================================

import React from 'react';
import Head from 'next/head';
import {
  Building2,
  MapPin,
  Phone,
  Users,
  Plus,
  Edit2,
  Eye,
  Activity,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Mock Data
// =============================================================================

const clinics = [
  {
    id: '1',
    name: 'Reed Family Medicine',
    address: '1234 Medical Center Dr, Suite 200, Portland, OR 97201',
    phone: '(503) 555-0147',
    providers: ['Dr. Thomas Reed', 'Dr. Sarah Kim', 'NP James Wilson'],
    status: 'Active',
    patientsToday: 12,
    patientsMonth: 847,
    uptime: 98.2,
  },
  {
    id: '2',
    name: 'Coastal Urgent Care',
    address: '5678 Oceanview Blvd, Lincoln City, OR 97367',
    phone: '(541) 555-0283',
    providers: ['Dr. Maria Santos', 'Dr. Alex Chen', 'Dr. Robert Kim', 'PA Emily Torres', 'NP David Park'],
    status: 'Active',
    patientsToday: 28,
    patientsMonth: 1247,
    uptime: 99.1,
  },
  {
    id: '3',
    name: 'Harbor Pediatrics',
    address: '910 Harbor Way, Suite 100, Newport, OR 97365',
    phone: '(541) 555-0394',
    providers: ['Dr. Lisa Chang', 'NP Rachel Green'],
    status: 'Active',
    patientsToday: 8,
    patientsMonth: 423,
    uptime: 97.8,
  },
];

// =============================================================================
// Clinic Card Component
// =============================================================================

function ClinicCard({ clinic }: { clinic: typeof clinics[0] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm hover:shadow-md transition-shadow">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-compass-100 rounded-xl">
              <Building2 className="w-6 h-6 text-compass-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{clinic.name}</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 mt-1">
                {clinic.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-200 bg-white/10 rounded-lg hover:bg-gray-200 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-compass-600 rounded-lg hover:bg-compass-700 transition-colors">
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-start gap-2.5 text-sm text-teal-200">
            <MapPin className="w-4 h-4 text-teal-300/50 mt-0.5 flex-shrink-0" />
            <span>{clinic.address}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-teal-200">
            <Phone className="w-4 h-4 text-teal-300/50 flex-shrink-0" />
            <span>{clinic.phone}</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-teal-200">
            <Users className="w-4 h-4 text-teal-300/50 mt-0.5 flex-shrink-0" />
            <span>{clinic.providers.join(', ')}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-sm text-teal-200/70 mb-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Today
            </div>
            <p className="text-xl font-bold text-white">{clinic.patientsToday}</p>
            <p className="text-xs text-teal-300/50">patients</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-sm text-teal-200/70 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              This Month
            </div>
            <p className="text-xl font-bold text-white">{clinic.patientsMonth.toLocaleString()}</p>
            <p className="text-xs text-teal-300/50">patients</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-sm text-teal-200/70 mb-1">
              <Activity className="w-3.5 h-3.5" />
              Uptime
            </div>
            <p className="text-xl font-bold text-white">{clinic.uptime}%</p>
            <p className="text-xs text-teal-300/50">availability</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function ClinicsPage() {
  return (
    <>
      <Head>
        <title>Clinic Management | ATTENDING Admin</title>
      </Head>

      <CompassAdminShell title="Clinic Management">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Clinic Management</h1>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-compass-600 text-white rounded-lg text-sm font-medium hover:bg-compass-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Clinic
            </button>
          </div>

          {/* Clinic Cards */}
          <div className="space-y-4">
            {clinics.map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
