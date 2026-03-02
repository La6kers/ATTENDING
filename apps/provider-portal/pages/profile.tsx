// =============================================================================
// Provider Profile Page
// apps/provider-portal/pages/profile.tsx
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  Building2,
  Award,
  Shield,
  Calendar,
  Clock,
  Edit2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  FileText,
  Activity,
} from 'lucide-react';

// Mock provider data - in production this would come from auth/API
const providerData = {
  id: 'provider-001',
  firstName: 'Thomas',
  lastName: 'Reed',
  email: 'thomas.reed@clinic.example.com',
  phone: '(555) 123-4567',
  npi: '1234567890',
  specialty: 'Family Medicine',
  credentials: 'MD, FAAFP',
  organization: 'Rural Health Clinic Network',
  department: 'Primary Care',
  licenseState: 'California',
  licenseNumber: 'A123456',
  licenseExpiry: '2025-12-31',
  deaNumber: 'AR1234567',
  deaExpiry: '2026-06-30',
  joinDate: '2022-03-15',
  lastLogin: '2024-01-15T14:30:00Z',
  avatar: null,
  bio: 'Board-certified family medicine physician with over 15 years of experience in rural healthcare settings. Special interests include chronic disease management and preventive care.',
  notifications: {
    email: true,
    sms: false,
    criticalAlerts: true,
    dailyDigest: true,
  },
};

// Statistics
const stats = [
  { label: 'Patients Seen', value: '2,847', icon: User, color: 'bg-blue-500' },
  { label: 'Assessments Reviewed', value: '1,523', icon: Activity, color: 'bg-green-500' },
  { label: 'Prescriptions', value: '4,291', icon: FileText, color: 'bg-teal-500' },
  { label: 'Avg. Response Time', value: '12 min', icon: Clock, color: 'bg-amber-500' },
];

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: providerData.phone,
    bio: providerData.bio,
  });

  const handleSave = () => {
    // In production, this would call an API
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isLicenseExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry < 90;
  };

  return (
    <>
      <Head>
        <title>My Profile | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="text-sm text-gray-500 mb-2">
              <Link href="/" className="hover:text-teal-600">Dashboard</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">My Profile</span>
            </nav>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            {/* Cover / Header */}
            <div className="h-32 bg-gradient-to-r from-teal-600 to-teal-800"></div>
            
            {/* Profile Info */}
            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 mb-6">
                {/* Avatar */}
                <div className="w-32 h-32 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white">
                  <div className="w-full h-full bg-gradient-to-br from-teal-600 to-teal-800 rounded-xl flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {providerData.firstName[0]}{providerData.lastName[0]}
                    </span>
                  </div>
                </div>
                
                {/* Name and Title */}
                <div className="flex-1 pt-4 sm:pt-0">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Dr. {providerData.firstName} {providerData.lastName}, {providerData.credentials}
                  </h2>
                  <p className="text-gray-600 flex items-center gap-2 mt-1">
                    <Stethoscope className="w-4 h-4" />
                    {providerData.specialty} • {providerData.organization}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">About</label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                ) : (
                  <p className="text-gray-600">{providerData.bio}</p>
                )}
              </div>

              {/* Contact Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{providerData.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="font-medium text-gray-900 border-b border-gray-300 focus:border-teal-500 focus:outline-none"
                      />
                    ) : (
                      <p className="font-medium text-gray-900">{providerData.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium text-gray-900">{providerData.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="font-medium text-gray-900">{formatDate(providerData.joinDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Credentials & Licenses */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              Credentials & Licenses
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NPI */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">NPI Number</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-lg font-mono font-medium text-gray-900">{providerData.npi}</p>
              </div>

              {/* Medical License */}
              <div className={`p-4 rounded-lg ${isLicenseExpiringSoon(providerData.licenseExpiry) ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">Medical License ({providerData.licenseState})</span>
                  {isLicenseExpiringSoon(providerData.licenseExpiry) ? (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-lg font-mono font-medium text-gray-900">{providerData.licenseNumber}</p>
                <p className="text-sm text-gray-500 mt-1">Expires: {formatDate(providerData.licenseExpiry)}</p>
              </div>

              {/* DEA */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">DEA Number</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-lg font-mono font-medium text-gray-900">{providerData.deaNumber}</p>
                <p className="text-sm text-gray-500 mt-1">Expires: {formatDate(providerData.deaExpiry)}</p>
              </div>

              {/* Specialty */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">Board Certification</span>
                  <Award className="w-4 h-4 text-teal-500" />
                </div>
                <p className="text-lg font-medium text-gray-900">{providerData.specialty}</p>
                <p className="text-sm text-gray-500 mt-1">{providerData.credentials}</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/settings"
              className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Security Settings</p>
                <p className="text-sm text-gray-500">Password, 2FA, sessions</p>
              </div>
            </Link>

            <Link
              href="/settings#notifications"
              className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Notifications</p>
                <p className="text-sm text-gray-500">Email, SMS, alerts</p>
              </div>
            </Link>

            <Link
              href="/help"
              className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Help & Support</p>
                <p className="text-sm text-gray-500">Documentation, contact</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
