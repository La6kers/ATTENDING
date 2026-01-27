// =============================================================================
// ATTENDING AI - Completed Visits Page
// apps/provider-portal/pages/visits/completed/index.tsx
//
// Shows history of completed patient visits with documentation
// List/Card toggle view
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Home,
  CheckCircle,
  Clock,
  User,
  ChevronRight,
  Calendar,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  DollarSign,
  Pill,
  FlaskConical,
  ImageIcon,
  Sparkles,
  TrendingUp,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';

// =============================================================================
// Theme
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface CompletedVisit {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  visitDate: string;
  visitTime: string;
  chiefComplaint: string;
  primaryDiagnosis: string;
  icdCode: string;
  secondaryDiagnoses: string[];
  provider: string;
  visitType: 'new' | 'follow-up' | 'urgent' | 'telehealth' | 'procedure';
  emLevel: string;
  billingTotal: number;
  billingStatus: 'pending' | 'submitted' | 'paid' | 'denied';
  orders: {
    medications: number;
    labs: number;
    imaging: number;
    referrals: number;
  };
  aiAssisted: boolean;
  documentationComplete: boolean;
}

// =============================================================================
// Mock Data
// =============================================================================

const getMockCompletedVisits = (): CompletedVisit[] => {
  const today = new Date();
  const visits: CompletedVisit[] = [];

  const mockPatients = [
    { name: 'James Anderson', age: 58, gender: 'Male', mrn: 'MRN-101', complaint: 'Diabetes management', diagnosis: 'Type 2 Diabetes Mellitus', icd: 'E11.9' },
    { name: 'Maria Garcia', age: 42, gender: 'Female', mrn: 'MRN-102', complaint: 'Hypertension follow-up', diagnosis: 'Essential Hypertension', icd: 'I10' },
    { name: 'Robert Chen', age: 35, gender: 'Male', mrn: 'MRN-103', complaint: 'New patient visit', diagnosis: 'Wellness Examination', icd: 'Z00.00' },
    { name: 'Emily Williams', age: 67, gender: 'Female', mrn: 'MRN-104', complaint: 'Chest pain evaluation', diagnosis: 'Atypical Chest Pain', icd: 'R07.9' },
    { name: 'David Kim', age: 51, gender: 'Male', mrn: 'MRN-105', complaint: 'Back pain', diagnosis: 'Lumbar Radiculopathy', icd: 'M54.16' },
    { name: 'Susan Taylor', age: 29, gender: 'Female', mrn: 'MRN-106', complaint: 'Anxiety symptoms', diagnosis: 'Generalized Anxiety Disorder', icd: 'F41.1' },
    { name: 'Michael Brown', age: 73, gender: 'Male', mrn: 'MRN-107', complaint: 'COPD exacerbation', diagnosis: 'Acute COPD Exacerbation', icd: 'J44.1' },
    { name: 'Jennifer Wilson', age: 45, gender: 'Female', mrn: 'MRN-108', complaint: 'Thyroid check', diagnosis: 'Hypothyroidism', icd: 'E03.9' },
    { name: 'Thomas Lee', age: 62, gender: 'Male', mrn: 'MRN-109', complaint: 'Post-surgery follow-up', diagnosis: 'Post-Surgical Follow-up', icd: 'Z09' },
    { name: 'Patricia Moore', age: 55, gender: 'Female', mrn: 'MRN-110', complaint: 'Joint pain', diagnosis: 'Osteoarthritis', icd: 'M19.90' },
    { name: 'Richard Harris', age: 48, gender: 'Male', mrn: 'MRN-111', complaint: 'Sleep problems', diagnosis: 'Insomnia', icd: 'G47.00' },
    { name: 'Nancy White', age: 71, gender: 'Female', mrn: 'MRN-112', complaint: 'Memory concerns', diagnosis: 'Mild Cognitive Impairment', icd: 'G31.84' },
    { name: 'Christopher Martin', age: 39, gender: 'Male', mrn: 'MRN-113', complaint: 'Headaches', diagnosis: 'Tension Headache', icd: 'G44.209' },
    { name: 'Linda Thompson', age: 44, gender: 'Female', mrn: 'MRN-114', complaint: 'Abdominal pain', diagnosis: 'Irritable Bowel Syndrome', icd: 'K58.9' },
    { name: 'William Davis', age: 56, gender: 'Male', mrn: 'MRN-115', complaint: 'Shortness of breath', diagnosis: 'Chronic Heart Failure', icd: 'I50.9' },
    { name: 'Elizabeth Johnson', age: 33, gender: 'Female', mrn: 'MRN-116', complaint: 'Skin rash', diagnosis: 'Contact Dermatitis', icd: 'L25.9' },
  ];

  const visitTypes: CompletedVisit['visitType'][] = ['follow-up', 'new', 'urgent', 'telehealth', 'procedure'];
  const emLevels = ['99213', '99214', '99215', '99203', '99204'];
  const billingStatuses: CompletedVisit['billingStatus'][] = ['paid', 'submitted', 'pending'];

  for (let i = 0; i < 16; i++) {
    const patient = mockPatients[i % mockPatients.length];
    const daysAgo = Math.floor(i / 3);
    const visitDate = new Date(today);
    visitDate.setDate(today.getDate() - daysAgo);
    
    const hours = 8 + (i % 8);
    const minutes = (i % 2) * 30;
    
    visits.push({
      id: `visit-${i + 1}`,
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.gender,
      mrn: patient.mrn,
      visitDate: visitDate.toISOString().split('T')[0],
      visitTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      chiefComplaint: patient.complaint,
      primaryDiagnosis: patient.diagnosis,
      icdCode: patient.icd,
      secondaryDiagnoses: i % 3 === 0 ? ['Essential Hypertension', 'Type 2 Diabetes'] : [],
      provider: 'Dr. Thomas Reed',
      visitType: visitTypes[i % visitTypes.length],
      emLevel: emLevels[i % emLevels.length],
      billingTotal: 85 + (i % 5) * 30,
      billingStatus: billingStatuses[i % billingStatuses.length],
      orders: {
        medications: i % 3,
        labs: i % 2,
        imaging: i % 4 === 0 ? 1 : 0,
        referrals: i % 5 === 0 ? 1 : 0,
      },
      aiAssisted: i % 2 === 0,
      documentationComplete: true,
    });
  }

  return visits.sort((a, b) => {
    const dateCompare = new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return b.visitTime.localeCompare(a.visitTime);
  });
};

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatTime = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getTypeColor = (type: CompletedVisit['visitType']) => {
  switch (type) {
    case 'new': return 'bg-blue-100 text-blue-700';
    case 'follow-up': return 'bg-gray-100 text-gray-700';
    case 'urgent': return 'bg-red-100 text-red-700';
    case 'telehealth': return 'bg-purple-100 text-purple-700';
    case 'procedure': return 'bg-amber-100 text-amber-700';
  }
};

const getBillingColor = (status: CompletedVisit['billingStatus']) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700';
    case 'submitted': return 'bg-blue-100 text-blue-700';
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'denied': return 'bg-red-100 text-red-700';
  }
};

// =============================================================================
// List Row Component
// =============================================================================

const VisitListRow: React.FC<{ visit: CompletedVisit; onClick: () => void }> = ({ visit, onClick }) => {
  const totalOrders = visit.orders.medications + visit.orders.labs + visit.orders.imaging + visit.orders.referrals;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all group"
    >
      {/* Status Indicator */}
      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
        <CheckCircle className="w-5 h-5 text-green-600" />
      </div>

      {/* Patient Info */}
      <div className="w-44 flex-shrink-0">
        <p className="font-semibold text-gray-900">{visit.patientName}</p>
        <p className="text-sm text-gray-500">{visit.patientAge}yo {visit.patientGender} • {visit.mrn}</p>
      </div>

      {/* Date & Time */}
      <div className="w-28 flex-shrink-0">
        <p className="font-medium text-gray-900">{formatDate(visit.visitDate)}</p>
        <p className="text-sm text-gray-500">{formatTime(visit.visitTime)}</p>
      </div>

      {/* Chief Complaint & Diagnosis */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-600 text-sm truncate">{visit.chiefComplaint}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-medium text-gray-900 truncate">{visit.primaryDiagnosis}</span>
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono flex-shrink-0">
            {visit.icdCode}
          </span>
        </div>
      </div>

      {/* Orders */}
      <div className="w-32 flex-shrink-0 flex gap-1">
        {visit.orders.medications > 0 && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs">
            <Pill className="w-3 h-3" />
            {visit.orders.medications}
          </span>
        )}
        {visit.orders.labs > 0 && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
            <FlaskConical className="w-3 h-3" />
            {visit.orders.labs}
          </span>
        )}
        {visit.orders.imaging > 0 && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
            <ImageIcon className="w-3 h-3" />
            {visit.orders.imaging}
          </span>
        )}
        {totalOrders === 0 && <span className="text-gray-400 text-xs">No orders</span>}
      </div>

      {/* Type & E&M */}
      <div className="w-28 flex-shrink-0 flex flex-col gap-1">
        <span className={`px-2 py-0.5 rounded text-xs font-medium text-center ${getTypeColor(visit.visitType)}`}>
          {visit.visitType === 'follow-up' ? 'Follow-up' : visit.visitType.charAt(0).toUpperCase() + visit.visitType.slice(1)}
        </span>
        <div className="flex items-center justify-center gap-1">
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">{visit.emLevel}</span>
          {visit.aiAssisted && <Sparkles className="w-3 h-3 text-purple-500" />}
        </div>
      </div>

      {/* Billing */}
      <div className="w-24 flex-shrink-0 text-right">
        <p className="font-semibold text-green-600">${visit.billingTotal}</p>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getBillingColor(visit.billingStatus)}`}>
          {visit.billingStatus.charAt(0).toUpperCase() + visit.billingStatus.slice(1)}
        </span>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </div>
  );
};

// =============================================================================
// Card Component
// =============================================================================

const VisitCard: React.FC<{ visit: CompletedVisit; onClick: () => void }> = ({ visit, onClick }) => {
  const totalOrders = visit.orders.medications + visit.orders.labs + visit.orders.imaging + visit.orders.referrals;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-all cursor-pointer border border-gray-100 hover:border-purple-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{visit.patientName}</h3>
            <p className="text-gray-500 text-sm">
              {visit.patientAge}yo {visit.patientGender} • {visit.mrn}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{formatDate(visit.visitDate)}</p>
          <p className="text-xs text-gray-500">{formatTime(visit.visitTime)}</p>
        </div>
      </div>

      {/* Diagnosis */}
      <div className="mb-3">
        <p className="text-sm text-gray-500">Chief Complaint</p>
        <p className="text-sm font-medium text-gray-800">{visit.chiefComplaint}</p>
      </div>

      <div className="p-3 bg-gray-50 rounded-lg mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Primary Diagnosis</p>
            <p className="font-medium text-gray-900">{visit.primaryDiagnosis}</p>
          </div>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
            {visit.icdCode}
          </span>
        </div>
      </div>

      {/* Orders Summary */}
      {totalOrders > 0 && (
        <div className="flex gap-2 mb-3">
          {visit.orders.medications > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
              <Pill className="w-3 h-3" />
              {visit.orders.medications}
            </span>
          )}
          {visit.orders.labs > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
              <FlaskConical className="w-3 h-3" />
              {visit.orders.labs}
            </span>
          )}
          {visit.orders.imaging > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
              <ImageIcon className="w-3 h-3" />
              {visit.orders.imaging}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(visit.visitType)}`}>
            {visit.visitType === 'follow-up' ? 'Follow-up' : 
             visit.visitType.charAt(0).toUpperCase() + visit.visitType.slice(1)}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
            {visit.emLevel}
          </span>
          {visit.aiAssisted && (
            <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
              <Sparkles className="w-3 h-3" />
              AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getBillingColor(visit.billingStatus)}`}>
            ${visit.billingTotal}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function CompletedVisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<CompletedVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  useEffect(() => {
    setTimeout(() => {
      setVisits(getMockCompletedVisits());
      setLoading(false);
    }, 300);
  }, []);

  const filteredVisits = visits.filter(visit => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        visit.patientName.toLowerCase().includes(query) ||
        visit.mrn.toLowerCase().includes(query) ||
        visit.primaryDiagnosis.toLowerCase().includes(query) ||
        visit.chiefComplaint.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (dateFilter !== 'all') {
      const visitDate = new Date(visit.visitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        const todayStr = today.toISOString().split('T')[0];
        if (visit.visitDate !== todayStr) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (visitDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        if (visitDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Group by date for card view
  const groupedVisits = filteredVisits.reduce((groups, visit) => {
    const date = visit.visitDate;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(visit);
    return groups;
  }, {} as Record<string, CompletedVisit[]>);

  const stats = {
    total: visits.length,
    todayCount: visits.filter(v => v.visitDate === new Date().toISOString().split('T')[0]).length,
    totalBilling: visits.reduce((sum, v) => sum + v.billingTotal, 0),
    aiAssisted: visits.filter(v => v.aiAssisted).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading completed visits...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Completed Visits | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link
                  href="/"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Home className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-white">Completed Visits</h1>
                  <p className="text-purple-200 text-sm">Visit history and documentation</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}
                    title="List View"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-purple-700' : 'text-white hover:bg-white/10'}`}
                    title="Card View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                                <button 
                  onClick={() => {
                    // Generate CSV export
                    const headers = ['Patient Name', 'MRN', 'Visit Date', 'Time', 'Chief Complaint', 'Primary Diagnosis', 'ICD Code', 'E&M Level', 'Billing Total', 'Status'];
                    const csvData = filteredVisits.map(v => [
                      v.patientName,
                      v.mrn,
                      v.visitDate,
                      v.visitTime,
                      v.chiefComplaint,
                      v.primaryDiagnosis,
                      v.icdCode,
                      v.emLevel,
                      `${v.billingTotal}`,
                      v.billingStatus
                    ].join(','));
                    const csv = [headers.join(','), ...csvData].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `completed-visits-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-purple-200 text-sm">Total Completed</p>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <p className="text-purple-200 text-sm">Today</p>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.todayCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <p className="text-purple-200 text-sm">Total Billed</p>
              </div>
              <p className="text-2xl font-bold text-white mt-1">${stats.totalBilling.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <p className="text-purple-200 text-sm">AI-Assisted</p>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{stats.aiAssisted}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              {[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'all', label: 'All Time' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setDateFilter(f.value as typeof dateFilter)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                    dateFilter === f.value
                      ? 'bg-white text-purple-700'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
              <input
                type="text"
                placeholder="Search by patient, diagnosis, or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          {/* Visits - List or Card View */}
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredVisits.map((visit) => (
                <VisitListRow
                  key={visit.id}
                  visit={visit}
                  onClick={() => router.push(`/visits/${visit.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedVisits).map(([date, dateVisits]) => (
                <div key={date}>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(date)}
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {dateVisits.length} visits
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dateVisits.map((visit) => (
                      <VisitCard
                        key={visit.id}
                        visit={visit}
                        onClick={() => router.push(`/visits/${visit.id}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredVisits.length === 0 && (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
              <FileText className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No visits found</h3>
              <p className="text-purple-200">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
