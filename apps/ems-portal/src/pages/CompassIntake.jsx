import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SymptomInput from '../components/SymptomInput';
import IntakeProgressBar from '../components/IntakeProgressBar';
import SaveAndContinue, { loadIntakeDraft, clearIntakeDraft } from '../components/SaveAndContinue';
import useIntakeTimer from '../hooks/useIntakeTimer';

const STEPS = ['welcome', 'demographics', 'symptoms', 'followup', 'vitals', 'complete'];

export default function CompassIntake() {
  const navigate = useNavigate();
  const [step, setStepRaw] = useState(0);
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

  // --- Timer & progress ---
  const timer = useIntakeTimer(STEPS.length);

  // Wrap setStep to also notify the timer
  const setStep = useCallback((newStep) => {
    timer.enterStep(newStep);
    setStepRaw(newStep);
  }, [timer]);

  // Periodic refresh of the time estimate (every 5s while active)
  const [timeLabel, setTimeLabel] = useState('');
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const update = () => {
      setTimeLabel(timer.getTimeRemainingLabel());
      setPercent(timer.getPercentComplete());
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [timer, step]);

  // --- Draft restore ---
  const handleRestore = useCallback((draft) => {
    if (draft.form) setForm(draft.form);
    if (draft.vitals) setVitals(draft.vitals);
    if (draft.step != null && draft.step > 0 && draft.step < STEPS.length - 1) {
      setStep(draft.step);
    }
    if (draft.followupQuestions) setFollowupQuestions(draft.followupQuestions);
    if (draft.followupAnswers) setFollowupAnswers(draft.followupAnswers);
    if (draft.patientId) setPatientId(draft.patientId);
    if (draft.encounterId) setEncounterId(draft.encounterId);
  }, [setStep]);

  // Build the state object for saving
  const intakeState = {
    form, vitals, step, followupQuestions, followupAnswers, patientId, encounterId,
  };

  const updateForm = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const currentStep = STEPS[step];

  // --- API helpers (unchanged) ---
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

    let pid = patientId;
    if (!pid) {
      const patient = await createPatient();
      pid = patient.id;
      setPatientId(pid);
    }

    const encRes = await fetch('/api/encounters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: pid, chief_complaint: symptoms })
    });
    const encounter = await encRes.json();
    setEncounterId(encounter.id);

    try {
      const aiRes = await fetch('/api/ai/intake-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: pid, current_symptoms: symptoms })
      });
      const aiData = await aiRes.json();
      const questions = aiData.questions || [];
      setFollowupQuestions(questions);
      timer.setFollowupQuestionCount(questions.length);
    } catch {
      setFollowupQuestions([]);
      timer.setFollowupQuestionCount(0);
    }

    setLoading(false);
    setStep(3);
  };

  const handleFollowupComplete = async () => {
    setLoading(true);

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
    setStep(4);
  };

  const handleVitalsSubmit = async () => {
    setLoading(true);

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

    try {
      await fetch('/api/ai/intake-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounter_id: encounterId })
      });
    } catch { /* summary will be generated later if needed */ }

    clearIntakeDraft();
    setLoading(false);
    setStep(5);
  };

  // --- Skip handler for non-critical fields ---
  const handleSkipOptionalFields = useCallback(() => {
    // On demographics, only first_name, last_name, dob, gender are required.
    // Insurance, allergies, medications, medical_history can be skipped.
    if (currentStep === 'demographics') {
      if (form.first_name && form.last_name && form.date_of_birth && form.gender) {
        setStep(2);
      }
    }
  }, [currentStep, form, setStep]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-compass-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-compass-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-compass-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6.115 5.19.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64" />
              </svg>
            </div>
            <span className="text-xl font-bold text-compass-800">Compass</span>
          </div>
        </div>
      </header>

      {/* Progress Bar -- renders itself only for steps 1-4 */}
      <div className="bg-white border-b border-compass-100 py-3 sm:py-4">
        <IntakeProgressBar
          currentStep={step}
          timeRemaining={timeLabel}
          percentComplete={percent}
        />

        {/* Fallback: on welcome/complete the progress bar returns null, show nothing extra */}
        {(step === 0 || step === 5) && <div className="h-0" />}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Resume banner (only on welcome) */}
        {currentStep === 'welcome' && (
          <SaveAndContinue intakeState={intakeState} onRestore={handleRestore} />
        )}

        {/* Step content with transition wrapper */}
        <div className="intake-fade-in" key={step}>
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
              {/* Time preview badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-compass-50 rounded-full text-compass-700 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Takes about 3-4 minutes
              </div>
              <div>
                <button onClick={() => setStep(1)} className="btn-compass text-lg px-8 py-3">
                  Begin Check-In
                </button>
              </div>
            </div>
          )}

          {currentStep === 'demographics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>
                <p className="text-gray-500 mt-1">Tell us a bit about yourself.</p>
              </div>

              <div className="card space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input id="first_name" className="input" required value={form.first_name} onChange={e => updateForm('first_name', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input id="last_name" className="input" required value={form.last_name} onChange={e => updateForm('last_name', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input id="dob" type="date" className="input" required value={form.date_of_birth} onChange={e => updateForm('date_of_birth', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                      Gender <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <select id="gender" className="input" required value={form.gender} onChange={e => updateForm('gender', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input id="phone" type="tel" className="input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input id="email" type="email" className="input" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ins_provider" className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                    <input id="ins_provider" className="input" value={form.insurance_provider} onChange={e => updateForm('insurance_provider', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="ins_id" className="block text-sm font-medium text-gray-700 mb-1">Insurance ID</label>
                    <input id="ins_id" className="input" value={form.insurance_id} onChange={e => updateForm('insurance_id', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Medical Background</h3>
                  <span className="text-xs text-gray-400">Optional</span>
                </div>
                <div>
                  <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">Known Allergies (comma-separated)</label>
                  <input id="allergies" className="input" placeholder="e.g., Penicillin, Sulfa drugs" value={form.allergies} onChange={e => updateForm('allergies', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-1">Current Medications (comma-separated)</label>
                  <input id="medications" className="input" placeholder="e.g., Lisinopril 10mg daily" value={form.medications} onChange={e => updateForm('medications', e.target.value)} />
                </div>
                <div>
                  <label htmlFor="med_history" className="block text-sm font-medium text-gray-700 mb-1">Medical History (comma-separated)</label>
                  <input id="med_history" className="input" placeholder="e.g., Hypertension, Diabetes" value={form.medical_history} onChange={e => updateForm('medical_history', e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.first_name || !form.last_name || !form.date_of_birth || !form.gender}
                  className="btn-compass flex-1 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>

              {/* Skip + Save row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <SaveAndContinue intakeState={intakeState} onRestore={handleRestore} />
                {form.first_name && form.last_name && form.date_of_birth && form.gender && (
                  <button
                    onClick={handleSkipOptionalFields}
                    className="text-sm text-gray-400 hover:text-compass-600 transition-colors underline underline-offset-2"
                  >
                    Skip optional fields
                  </button>
                )}
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                <SaveAndContinue intakeState={intakeState} onRestore={handleRestore} />
              </div>
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
                    <div key={i} className="card intake-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                      <label htmlFor={`followup-${i}`} className="block text-sm font-medium text-gray-900 mb-2">
                        {q.question}
                      </label>
                      <textarea
                        id={`followup-${i}`}
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

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleFollowupComplete} disabled={loading} className="btn-compass flex-1 disabled:opacity-50">
                  {loading ? 'Processing...' : 'Continue'}
                </button>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <SaveAndContinue intakeState={intakeState} onRestore={handleRestore} />
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
                      <label htmlFor={`vital-${key}`} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        id={`vital-${key}`}
                        className="input"
                        placeholder={placeholder}
                        value={vitals[key]}
                        onChange={e => setVitals(v => ({ ...v, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setStep(3)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleVitalsSubmit} disabled={loading} className="btn-compass flex-1 disabled:opacity-50">
                  {loading ? 'Completing check-in...' : 'Complete Check-In'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-compass-100 rounded-full flex items-center justify-center mx-auto intake-scale-in">
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
    </div>
  );
}
