// ============================================================
// ATTENDING AI — Edit Medical ID
// apps/patient-portal/pages/emergency/medical-id.tsx
// ============================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Droplets,
  AlertTriangle,
  Heart,
  Pill,
  FileText,
  User,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { patientApi } from '../../lib/api';

// ============================================================
// Types
// ============================================================

interface MedicalID {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  bloodType: string;
  height: string;
  weight: string;
  allergies: { name: string; severity: string; reaction: string }[];
  conditions: { name: string; since: string }[];
  medications: { name: string; dosage: string; frequency: string }[];
  emergencyNotes: string;
  organDonor: boolean;
}

// ============================================================
// Editable List
// ============================================================

function EditableList<T extends Record<string, string>>({
  title,
  icon: Icon,
  items,
  fields,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  icon: React.ElementType;
  items: T[];
  fields: { key: keyof T; label: string; placeholder: string; width?: string }[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, key: keyof T, value: string) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-attending-primary" />
        {title}
      </h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="card-attending p-3 relative">
            <button
              onClick={() => onRemove(idx)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100"
            >
              <X className="w-3 h-3 text-red-500" />
            </button>
            <div className="grid grid-cols-2 gap-2 pr-6">
              {fields.map((field) => (
                <div key={String(field.key)} className={field.width || ''}>
                  <label className="text-[10px] text-attending-200 font-medium">{field.label}</label>
                  <input
                    type="text"
                    value={item[field.key]}
                    onChange={(e) => onChange(idx, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="w-full py-2.5 border-2 border-dashed border-attending-200 rounded-xl text-sm text-attending-primary font-medium hover:border-attending-primary hover:bg-attending-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add {title.replace(/s$/, '')}
        </button>
      </div>
    </section>
  );
}

// ============================================================
// Main
// ============================================================

export default function EditMedicalID() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [medicalID, setMedicalID] = useState<MedicalID>({
    fullName: 'Scott Isbell',
    dateOfBirth: '1986-05-15',
    sex: 'Male',
    bloodType: 'O+',
    height: '5\'11"',
    weight: '185 lbs',
    allergies: [
      { name: 'Penicillin', severity: 'Severe', reaction: 'Anaphylaxis' },
      { name: 'Sulfa drugs', severity: 'Moderate', reaction: 'Rash' },
    ],
    conditions: [
      { name: 'Hypertension', since: '2023' },
      { name: 'Pre-diabetes', since: '2024' },
    ],
    medications: [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
    ],
    emergencyNotes: '',
    organDonor: false,
  });

  // Load from API on mount
  useEffect(() => {
    (async () => {
      const res = await patientApi.getMedicalID();
      if (res.ok && res.data) {
        setMedicalID(res.data);
      }
      setLoading(false);
    })();
  }, []);

  const updateField = (field: keyof MedicalID, value: any) => {
    setMedicalID((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await patientApi.saveMedicalID(medicalID);
    setSaving(false);
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => router.back(), 1000);
    }
  };

  return (
    <>
      <Head>
        <title>Edit Medical ID | ATTENDING AI</title>
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
                <h1 className="text-lg font-bold text-attending-deep-navy">Edit Medical ID</h1>
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
        <div className="max-w-lg mx-auto px-5 py-5 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-attending-primary" />
              Personal Information
            </h3>
            <div className="card-attending p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-attending-200 font-medium">Full Name</label>
                  <input
                    type="text"
                    value={medicalID.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="w-full px-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-attending-200 font-medium">Date of Birth</label>
                  <input
                    type="date"
                    value={medicalID.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-attending-200 font-medium">Sex</label>
                  <select
                    value={medicalID.sex}
                    onChange={(e) => updateField('sex', e.target.value)}
                    className="w-full px-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-attending-200 font-medium">Blood Type</label>
                  <select
                    value={medicalID.bloodType}
                    onChange={(e) => updateField('bloodType', e.target.value)}
                    className="w-full px-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-attending-200 font-medium">Height</label>
                  <input
                    type="text"
                    value={medicalID.height}
                    onChange={(e) => updateField('height', e.target.value)}
                    className="w-full px-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-attending-200 font-medium">Weight</label>
                  <input
                    type="text"
                    value={medicalID.weight}
                    onChange={(e) => updateField('weight', e.target.value)}
                    className="w-full px-3 py-2.5 bg-attending-50 border-0 rounded-lg text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Allergies */}
          <EditableList
            title="Allergies"
            icon={AlertTriangle}
            items={medicalID.allergies}
            fields={[
              { key: 'name', label: 'Allergen', placeholder: 'e.g. Penicillin' },
              { key: 'severity', label: 'Severity', placeholder: 'Mild/Moderate/Severe' },
              { key: 'reaction', label: 'Reaction', placeholder: 'e.g. Rash, Anaphylaxis', width: 'col-span-2' },
            ]}
            onAdd={() =>
              updateField('allergies', [...medicalID.allergies, { name: '', severity: '', reaction: '' }])
            }
            onRemove={(i) => updateField('allergies', medicalID.allergies.filter((_, idx) => idx !== i))}
            onChange={(i, key, val) => {
              const updated = [...medicalID.allergies];
              updated[i] = { ...updated[i], [key]: val };
              updateField('allergies', updated);
            }}
          />

          {/* Conditions */}
          <EditableList
            title="Conditions"
            icon={Heart}
            items={medicalID.conditions}
            fields={[
              { key: 'name', label: 'Condition', placeholder: 'e.g. Hypertension' },
              { key: 'since', label: 'Since', placeholder: 'e.g. 2023' },
            ]}
            onAdd={() =>
              updateField('conditions', [...medicalID.conditions, { name: '', since: '' }])
            }
            onRemove={(i) => updateField('conditions', medicalID.conditions.filter((_, idx) => idx !== i))}
            onChange={(i, key, val) => {
              const updated = [...medicalID.conditions];
              updated[i] = { ...updated[i], [key]: val };
              updateField('conditions', updated);
            }}
          />

          {/* Medications */}
          <EditableList
            title="Medications"
            icon={Pill}
            items={medicalID.medications}
            fields={[
              { key: 'name', label: 'Medication', placeholder: 'e.g. Lisinopril' },
              { key: 'dosage', label: 'Dosage', placeholder: 'e.g. 10mg' },
              { key: 'frequency', label: 'Frequency', placeholder: 'e.g. Once daily', width: 'col-span-2' },
            ]}
            onAdd={() =>
              updateField('medications', [...medicalID.medications, { name: '', dosage: '', frequency: '' }])
            }
            onRemove={(i) => updateField('medications', medicalID.medications.filter((_, idx) => idx !== i))}
            onChange={(i, key, val) => {
              const updated = [...medicalID.medications];
              updated[i] = { ...updated[i], [key]: val };
              updateField('medications', updated);
            }}
          />

          {/* Emergency Notes */}
          <section>
            <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-attending-primary" />
              Emergency Notes
            </h3>
            <textarea
              value={medicalID.emergencyNotes}
              onChange={(e) => updateField('emergencyNotes', e.target.value)}
              placeholder="Any additional information for first responders (e.g., implanted devices, cognitive conditions, language needs)..."
              rows={3}
              className="w-full px-4 py-3 bg-white border border-light rounded-xl text-sm text-attending-deep-navy focus:ring-2 focus:ring-attending-primary/30 resize-none"
            />
          </section>

          {/* Organ Donor */}
          <div className="card-attending px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-attending-deep-navy">Organ Donor</p>
              <p className="text-xs text-attending-200">Display on Medical ID</p>
            </div>
            <button
              onClick={() => updateField('organDonor', !medicalID.organDonor)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                medicalID.organDonor ? 'bg-attending-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  medicalID.organDonor ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </AppShell>
    </>
  );
}
