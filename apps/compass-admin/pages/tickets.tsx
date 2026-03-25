// =============================================================================
// ATTENDING Admin - Support Tickets
// apps/compass-admin/pages/tickets.tsx
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import {
  Ticket,
  Plus,
  Search,
  Clock,
  AlertCircle,
  User,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';

// =============================================================================
// Types
// =============================================================================

type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
type TicketStatus = 'Open' | 'In Progress' | 'Resolved';
type StatusFilter = 'All' | 'Open' | 'In Progress' | 'Resolved';

interface SupportTicket {
  id: string;
  title: string;
  clinic: string;
  severity: Severity;
  status: TicketStatus;
  timeAgo: string;
  assignedTo: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const tickets: SupportTicket[] = [
  { id: 'TICK-001', title: 'Login timeout on tablet kiosk', clinic: 'Reed Family Medicine', severity: 'High', status: 'Open', timeAgo: '2 hrs ago', assignedTo: 'MK' },
  { id: 'TICK-002', title: 'AI differential not loading for new patients', clinic: 'Coastal Urgent Care', severity: 'Critical', status: 'In Progress', timeAgo: '4 hrs ago', assignedTo: 'JW' },
  { id: 'TICK-003', title: 'COMPASS assessment stuck on Review of Systems', clinic: 'Harbor Pediatrics', severity: 'Medium', status: 'Open', timeAgo: '6 hrs ago', assignedTo: 'SR' },
  { id: 'TICK-004', title: 'Billing meter showing incorrect API call counts', clinic: 'Reed Family Medicine', severity: 'High', status: 'In Progress', timeAgo: '1 day ago', assignedTo: 'MK' },
  { id: 'TICK-005', title: 'Need to add Dr. Martinez to Clinic B', clinic: 'Coastal Urgent Care', severity: 'Low', status: 'Open', timeAgo: '1 day ago', assignedTo: 'AL' },
  { id: 'TICK-006', title: 'Patient portal not sending assessment notifications', clinic: 'Harbor Pediatrics', severity: 'High', status: 'Open', timeAgo: '2 days ago', assignedTo: 'JW' },
  { id: 'TICK-007', title: 'Ambient listening microphone permission error on Chrome', clinic: 'Reed Family Medicine', severity: 'Medium', status: 'Resolved', timeAgo: '3 days ago', assignedTo: 'SR' },
  { id: 'TICK-008', title: 'SOAP note export formatting broken in PDF', clinic: 'Coastal Urgent Care', severity: 'Medium', status: 'Resolved', timeAgo: '4 days ago', assignedTo: 'MK' },
  { id: 'TICK-009', title: 'Drug interaction check missing warfarin combinations', clinic: 'Reed Family Medicine', severity: 'Critical', status: 'Resolved', timeAgo: '5 days ago', assignedTo: 'JW' },
  { id: 'TICK-010', title: 'Provider schedule sync with EHR failing', clinic: 'Harbor Pediatrics', severity: 'High', status: 'Resolved', timeAgo: '1 week ago', assignedTo: 'AL' },
];

// =============================================================================
// Helpers
// =============================================================================

const severityColors: Record<Severity, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-green-500',
};

const statusBadge: Record<TicketStatus, { bg: string; text: string }> = {
  'Open': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'In Progress': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Resolved': { bg: 'bg-green-100', text: 'text-green-700' },
};

// =============================================================================
// Main Page
// =============================================================================

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.clinic.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <Head>
        <title>Support Tickets | ATTENDING Admin</title>
      </Head>

      <CompassAdminShell title="Support Tickets">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-compass-600 text-white rounded-lg text-sm font-medium hover:bg-compass-700 transition-colors">
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm p-1">
              {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-compass-600 text-white'
                      : 'text-teal-200 hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300/50" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-compass-300 focus:border-compass-400 w-72"
              />
            </div>
          </div>

          {/* Ticket List */}
          <div className="rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-sm overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_180px_100px_100px_50px] gap-4 px-5 py-3 border-b border-white/5 bg-white/5 text-xs font-medium text-teal-200/70 uppercase tracking-wider">
              <div className="w-3"></div>
              <div>Ticket</div>
              <div>Clinic</div>
              <div>Time</div>
              <div>Status</div>
              <div>Assigned</div>
            </div>

            {/* Ticket Rows */}
            {filtered.length > 0 ? (
              filtered.map((ticket) => {
                const badge = statusBadge[ticket.status];
                return (
                  <div
                    key={ticket.id}
                    className="grid grid-cols-1 sm:grid-cols-[auto_1fr_180px_100px_100px_50px] gap-2 sm:gap-4 items-center px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {/* Severity dot */}
                    <div className="hidden sm:flex items-center">
                      <div className={`w-3 h-3 rounded-full ${severityColors[ticket.severity]}`} title={ticket.severity} />
                    </div>

                    {/* Title + ID */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 sm:hidden mb-1">
                        <div className={`w-3 h-3 rounded-full ${severityColors[ticket.severity]}`} />
                        <span className="text-xs font-mono text-teal-300/50">{ticket.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline text-xs font-mono text-teal-300/50">{ticket.id}</span>
                        <p className="text-sm font-medium text-white truncate">{ticket.title}</p>
                      </div>
                      <p className="text-xs text-teal-200/70 sm:hidden mt-0.5">{ticket.clinic}</p>
                    </div>

                    {/* Clinic */}
                    <div className="hidden sm:block text-sm text-teal-200 truncate">{ticket.clinic}</div>

                    {/* Time */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-teal-200/70">
                      <Clock className="w-3 h-3" />
                      {ticket.timeAgo}
                    </div>

                    {/* Status */}
                    <div className="hidden sm:block">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {ticket.status}
                      </span>
                    </div>

                    {/* Assigned avatar */}
                    <div className="hidden sm:flex justify-center">
                      <div className="w-7 h-7 rounded-full bg-compass-100 text-compass-700 flex items-center justify-center text-xs font-semibold">
                        {ticket.assignedTo}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <Ticket className="w-12 h-12 text-teal-300/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-teal-100 mb-1">No tickets found</h3>
                <p className="text-teal-200/70 text-sm">
                  {searchQuery ? 'Try a different search term.' : 'No tickets match the selected filter.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
