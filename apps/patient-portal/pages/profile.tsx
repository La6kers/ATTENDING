// =============================================================================
// ATTENDING AI - Patient Profile Page
// apps/patient-portal/pages/profile.tsx
//
// Patient profile management including:
// - Personal information
// - Medical history
// - Emergency contacts
// - Preferences and settings
// =============================================================================

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Heart,
  Bell,
  Shield,
  ChevronRight,
  Edit2,
  Save,
  X,
  LogOut,
  Users,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface PatientProfile {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // Medical Info
  bloodType?: string;
  conditions: string[];
  medications: string[];
  allergies: string[];

  // Emergency Contact
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };

  // Preferences
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    smsReminders: boolean;
  };
}

// ============================================================================
// Profile Section Component
// ============================================================================

const ProfileSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onEdit?: () => void;
}> = ({ title, icon, children, onEdit }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="text-purple-600 hover:text-purple-700 p-1">
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

// ============================================================================
// Info Row Component
// ============================================================================

const InfoRow: React.FC<{
  label: string;
  value: string;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex items-start py-2">
    {icon && <div className="w-8 flex-shrink-0 text-gray-400">{icon}</div>}
    <div className="flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value || 'Not provided'}</p>
    </div>
  </div>
);

// ============================================================================
// Tag Display Component
// ============================================================================

const TagDisplay: React.FC<{
  items: string[];
  emptyText: string;
  color?: 'purple' | 'blue' | 'red' | 'green';
}> = ({ items, emptyText, color = 'gray' }) => {
  const colors = {
    purple: 'bg-purple-50 text-purple-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  if (items.length === 0 || (items.length === 1 && items[0] === 'NKDA')) {
    return <p className="text-sm text-gray-400">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`text-sm px-3 py-1 rounded-full ${colors[color]}`}>
          {item}
        </span>
      ))}
    </div>
  );
};

// ============================================================================
// Toggle Setting Component
// ============================================================================

const ToggleSetting: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'left-7' : 'left-1'}`}
      />
    </button>
  </div>
);

// ============================================================================
// Edit Modal Component
// ============================================================================

const EditModal: React.FC<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onClose, onSave, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">{children}</div>
        <div className="flex gap-3 p-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/patient/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Mock data for demonstration
  useEffect(() => {
    if (loading) return;
    if (!profile) {
      setProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        phone: '(555) 123-4567',
        dateOfBirth: '1985-03-15',
        gender: 'Male',
        address: {
          street: '123 Main Street',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
        bloodType: 'O+',
        conditions: ['Hypertension', 'Type 2 Diabetes'],
        medications: ['Lisinopril 10mg', 'Metformin 500mg'],
        allergies: ['Penicillin', 'Sulfa'],
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '(555) 987-6543',
        },
        preferences: {
          notifications: true,
          emailUpdates: true,
          smsReminders: false,
        },
      });
    }
  }, [loading, profile]);

  const handleSavePreferences = (key: keyof PatientProfile['preferences'], value: boolean) => {
    if (!profile) return;
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [key]: value,
      },
    });
    // TODO: Save to API
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile not found</h2>
          <Link href="/dashboard">
            <button className="text-purple-600 hover:text-purple-700">Return to Dashboard</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profile | COMPASS - ATTENDING AI</title>
        <meta name="description" content="Manage your patient profile" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
            </div>
          </div>
        </header>

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-purple-200">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Personal Information */}
          <ProfileSection
            title="Personal Information"
            icon={<User className="w-5 h-5 text-purple-600" />}
            onEdit={() => setEditingSection('personal')}
          >
            <div className="space-y-1">
              <InfoRow label="Full Name" value={`${profile.firstName} ${profile.lastName}`} icon={<User className="w-4 h-4" />} />
              <InfoRow label="Email" value={profile.email} icon={<Mail className="w-4 h-4" />} />
              <InfoRow label="Phone" value={profile.phone} icon={<Phone className="w-4 h-4" />} />
              <InfoRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow
                label="Address"
                value={`${profile.address.street}, ${profile.address.city}, ${profile.address.state} ${profile.address.zip}`}
                icon={<MapPin className="w-4 h-4" />}
              />
            </div>
          </ProfileSection>

          {/* Medical Information */}
          <ProfileSection
            title="Medical Information"
            icon={<Heart className="w-5 h-5 text-red-500" />}
            onEdit={() => setEditingSection('medical')}
          >
            <div className="space-y-4">
              {profile.bloodType && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Blood Type</p>
                  <span className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full">{profile.bloodType}</span>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-2">Medical Conditions</p>
                <TagDisplay items={profile.conditions} emptyText="No conditions reported" color="purple" />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Current Medications</p>
                <TagDisplay items={profile.medications} emptyText="No medications reported" color="blue" />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Allergies</p>
                <TagDisplay items={profile.allergies} emptyText="No known drug allergies (NKDA)" color="red" />
              </div>
            </div>
          </ProfileSection>

          {/* Emergency Contact */}
          <ProfileSection
            title="Emergency Contact"
            icon={<Users className="w-5 h-5 text-orange-500" />}
            onEdit={() => setEditingSection('emergency')}
          >
            <div className="space-y-1">
              <InfoRow label="Name" value={profile.emergencyContact.name} icon={<User className="w-4 h-4" />} />
              <InfoRow label="Relationship" value={profile.emergencyContact.relationship} />
              <InfoRow label="Phone" value={profile.emergencyContact.phone} icon={<Phone className="w-4 h-4" />} />
            </div>
          </ProfileSection>

          {/* Notification Preferences */}
          <ProfileSection title="Notifications" icon={<Bell className="w-5 h-5 text-blue-500" />}>
            <div className="divide-y divide-gray-100">
              <ToggleSetting
                label="Push Notifications"
                description="Receive alerts about assessment updates"
                enabled={profile.preferences.notifications}
                onChange={(v) => handleSavePreferences('notifications', v)}
              />
              <ToggleSetting
                label="Email Updates"
                description="Get assessment results via email"
                enabled={profile.preferences.emailUpdates}
                onChange={(v) => handleSavePreferences('emailUpdates', v)}
              />
              <ToggleSetting
                label="SMS Reminders"
                description="Receive text reminders for follow-ups"
                enabled={profile.preferences.smsReminders}
                onChange={(v) => handleSavePreferences('smsReminders', v)}
              />
            </div>
          </ProfileSection>

          {/* Security & Privacy */}
          <ProfileSection title="Security & Privacy" icon={<Shield className="w-5 h-5 text-green-500" />}>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-lg px-2 -mx-2">
                <span className="text-sm text-gray-900">Change Password</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-lg px-2 -mx-2">
                <span className="text-sm text-gray-900">Privacy Settings</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-lg px-2 -mx-2">
                <span className="text-sm text-gray-900">Download My Data</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </ProfileSection>

          {/* Sign Out */}
          <button className="w-full bg-white border border-red-200 text-red-600 rounded-xl py-3 font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>

          {/* App Version */}
          <p className="text-center text-xs text-gray-400 py-4">COMPASS v1.0.0 | ATTENDING AI</p>
        </main>

        {/* Edit Modals */}
        <EditModal
          title="Edit Personal Information"
          isOpen={editingSection === 'personal'}
          onClose={() => setEditingSection(null)}
          onSave={() => setEditingSection(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  defaultValue={profile.firstName}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  defaultValue={profile.lastName}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                defaultValue={profile.email}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                defaultValue={profile.phone}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </EditModal>
      </div>
    </>
  );
}
