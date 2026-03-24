import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SymptomInput from '../components/SymptomInput';

const STEPS = ['welcome', 'demographics', 'symptoms', 'followup', 'vitals', 'complete'];

export default function CompassIntake() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [followupQuestions, setFollowupQuestions] = useState([]);
  const [followupAnswers, setFollowupAnswers] = useState({});
  const [patientId, setPatientId] = useState(null);
  const [encounterId, setEncounterId] = useState(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: '',
    phone: '', email: '', insurance_provider: '', insurance_id: '',
    allergies: '', medications: '', medical_history: '',
    chief_complaint: '',
  });
  const [vitals, setVitals] = useState({
    bp: '', hr: '', rr: '', temp: '', spo2: '', weight: ''
  });

  const updateForm = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const currentStep = STEPS[step];

  const createPatient = async () => {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
        medications: form.medications ? form.medications.split(',').map(s => s.trim()) : [],
        medical_history: form.medical_history ? form.medical_history.split(',').map(s => s.trim()) : [],
      })
    });
    return res.json();
  };

  const handleSymptomsSubmit = async (symptoms) => {
    setLoading(true);
    updateForm('chief_complaint', symptoms);

    // Create patient if not exists
    let pid = patientId;
    if (!pid) {
      const patient = await createPatient();
      pid = patient.id;
      setPatientId(pid);
    }

    // Create encounter
    const encRes = await fetch('/api/encounters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: pid, chief_complaint: symptoms })
    });
    const encounter = await encRes.json();
    setEncounterId(encounter.id);

    // Get AI follow-up questions
    try {
      const aiRes = await fetch('/api/ai/intake-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: pid, current_symptoms: symptoms })
      });
      const aiData = await aiRes.json();
      setFollowupQuestions(aiData.questions || []);
    } catch {
      setFollowupQuestions([]);
    }

    setLoading(false);
    setStep(3); // followup
  };

  const handleFollowupComplete = async () => {
    setLoading(true);

    // Update encounter with intake data
    const intakeData = {
      chief_complaint: form.chief_complaint,
      followup_responses: followupAnswers,
    };
    await fetch(`/api/encounters/${encounterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intake_data: intakeData })
    });

    setLoading(false);
    setStep(4); // vitals
  };

  const handleVitalsSubmit = async () => {
    setLoading(true);

    // Update encounter with vitals and move to waiting
    await fetch(`/api/encounters/${encounterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vitals })
    });
    await fetch(`/api/encounters/${encounterId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'waiting' })
    });

    // Generate intake summary
    try {
      await fetch('/api/ai/intake-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounter_id: encounterId })
      });
    } catch { /* summary will be generated later if needed */ }

    setLoading(false);
    setStep(5); // complete
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-compass-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-compass-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-compass-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6.115 5.19.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" />
              </svg>
            </div>
            <span className="text-xl font-bold text-compass-800">Compass</span>
          </div>
          {/* Progress */}
          <div className="flex gap-1.5">
            {STEPS.slice(1, -1).map((s, i) => (
              <div
                key={s}
                className={`w-8 h-1.5 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-compass-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {currentStep === 'welcome' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-compass-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-compass-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Compass</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Let's get you checked in. This will only take a few minutes and helps your doctor prepare for your visit.
            </p>
            <button onClick={() => setStep(1)} className="btn-compass text-lg px-8 py-3">
              Begin Check-In
            </button>
          </div>
        )}

        {currentStep === 'demographics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>
              <p className="text-gray-500 mt-1">Tell us a bit about yourself.</p>
            </div>

            <div className="card space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input className="input" value={form.first_name} onChange={e => updateForm('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input className="input" value={form.last_name} onChange={e => updateForm('last_name', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" className="input" value={form.date_of_birth} onChange={e => updateForm('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select className="input" value={form.gender} onChange={e => updateForm('gender', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input className="input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="input" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                  <input className="input" value={form.insurance_provider} onChange={e => updateForm('insurance_provider', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance ID</label>
                  <input className="input" value={form.insurance_id} onChange={e => updateForm('insurance_id', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Medical Background</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Known Allergies (comma-separated)</label>
                <input className="input" placeholder="e.g., Penicillin, Sulfa drugs" value={form.allergies} onChange={e => updateForm('allergies', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications (comma-separated)</label>
                <input className="input" placeholder="e.g., Lisinopril 10mg daily" value={form.medications} onChange={e => updateForm('medications', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical History (comma-separated)</label>
                <input className="input" placeholder="e.g., Hypertension, Diabetes" value={form.medical_history} onChange={e => updateForm('medical_history', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
              <button
                onClick={() => setStep(2)}
                disabled={!form.first_name || !form.last_name || !form.date_of_birth || !form.gender}
                className="btn-compass flex-1 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {currentStep === 'symptoms' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">What brings you in today?</h2>
              <p className="text-gray-500 mt-1">Describe your symptoms or reason for your visit.</p>
            </div>
            <div className="card">
              <SymptomInput onSubmit={handleSymptomsSubmit} loading={loading} />
            </div>
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
          </div>
        )}

        {currentStep === 'followup' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">A few more questions</h2>
              <p className="text-gray-500 mt-1">Help us understand your symptoms better.</p>
            </div>

            {followupQuestions.length > 0 ? (
              <div className="space-y-4">
                {followupQuestions.map((q, i) => (
                  <div key={i} className="card">
                    <label className="block text-sm font-medium text-gray-900 mb-2">{q.question}</label>
                    <textarea
                      className="input min-h-[60px] resize-none"
                      placeholder="Your answer..."
                      value={followupAnswers[i] || ''}
                      onChange={e => setFollowupAnswers(a => ({ ...a, [i]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center text-gray-500">
                <p>No additional questions needed. You can proceed to the next step.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleFollowupComplete} disabled={loading} className="btn-compass flex-1 disabled:opacity-50">
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'vitals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vitals</h2>
              <p className="text-gray-500 mt-1">A nurse will help record your vital signs.</p>
            </div>

            <div className="card">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'bp', label: 'Blood Pressure', placeholder: '120/80' },
                  { key: 'hr', label: 'Heart Rate', placeholder: '72' },
                  { key: 'rr', label: 'Respiratory Rate', placeholder: '16' },
                  { key: 'temp', label: 'Temperature', placeholder: '98.6' },
                  { key: 'spo2', label: 'SpO2', placeholder: '99%' },
                  { key: 'weight', label: 'Weight (lbs)', placeholder: '165' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      className="input"
                      placeholder={placeholder}
                      value={vitals[key]}
                      onChange={e => setVitals(v => ({ ...v, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleVitalsSubmit} disabled={loading} className="btn-compass flex-1 disabled:opacity-50">
                {loading ? 'Completing check-in...' : 'Complete Check-In'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-compass-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-compass-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">You're all checked in!</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Your doctor has been notified and will see you shortly. Please have a seat in the waiting area.
            </p>
            <div className="card inline-block text-left">
              <p className="text-sm text-gray-500">Your check-in summary has been sent to:</p>
              <p className="font-semibold mt-1">Dr. Demo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
