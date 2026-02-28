// ============================================================
// ATTENDING AI — Emergency Contacts Editor
// apps/patient-portal/pages/emergency/contacts.tsx
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  User,
  Phone,
  Star,
  GripVertical,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export default function EmergencyContactsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Kelli Isbell', relationship: 'Spouse', phone: '(555) 123-4567', isPrimary: true },
    { id: '2', name: 'Ken Isbell', relationship: 'Father', phone: '(555) 987-6543', isPrimary: false },
  ]);

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', relationship: '', phone: '', isPrimary: false },
    ]);
  };

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const updateContact = (id: string, field: keyof EmergencyContact, value: string | boolean) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return field === 'isPrimary' && value === true ? { ...c, isPrimary: false } : c;
        return { ...c, [field]: value };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    router.back();
  };

  return (
    <>
      <Head>
        <title>Emergency Contacts | ATTENDING AI</title>
      </Head>

      <AppShell
        hideNav
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5 text-attending-deep-navy" />
                </button>
                <h1 className="text-lg font-bold text-attending-deep-navy">Emergency Contacts</h1>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-attending-primary text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto px-5 py-5 space-y-4">
          <p className="text-xs text-attending-200">
            These contacts will be notified if crash detection triggers an emergency event.
            The primary contact is called first.
          </p>

          {contacts.map((contact, idx) => (
            <div key={contact.id} className="card-attending p-4 relative">
              {/* Remove button */}
              <button
                onClick={() => removeContact(contact.id)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>

              {/* Primary toggle */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => updateContact(contact.id, 'isPrimary', true)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    contact.isPrimary
                      ? 'bg-attending-primary text-white'
                      : 'bg-attending-50 text-attending-200 hover:text-attending-primary'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  {contact.isPrimary ? 'Primary Contact' : 'Set as Primary'}
                </button>
                <span className="text-xs text-attending-200">Contact #{idx + 1}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-attending-200 font-medium">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-attending-200" />
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                      placeholder="Full name"
                      className="w-full pl-9 pr-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-attending-200 font-medium">Relationship</label>
                  <select
                    value={contact.relationship}
                    onChange={(e) => updateContact(contact.id, 'relationship', e.target.value)}
                    className="w-full px-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  >
                    <option value="">Select...</option>
                    {['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Partner', 'Other'].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-attending-200 font-medium">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-attending-200" />
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full pl-9 pr-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add contact */}
          <button
            onClick={addContact}
            className="w-full py-3 border-2 border-dashed border-attending-200 rounded-xl text-sm text-attending-primary font-medium hover:border-attending-primary hover:bg-attending-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Emergency Contact
          </button>

          {contacts.length >= 3 && (
            <p className="text-[10px] text-attending-200 text-center">
              You can add up to 5 emergency contacts
            </p>
          )}
        </div>
      </AppShell>
    </>
  );
}
