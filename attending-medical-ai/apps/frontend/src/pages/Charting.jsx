import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AIInsight from '../components/AIInsight';

export default function Charting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState(null);
  const [form, setForm] = useState({
    exam_notes: '',
    assessment: '',
    plan: '',
  });

  useEffect(() => {
    fetchEncounter();
  }, [id]);

  const fetchEncounter = async () => {
    const res = await fetch(`/api/encounters/${id}`);
    const data = await res.json();
    setEncounter(data);
    setForm({
      exam_notes: data.exam_notes || '',
      assessment: data.assessment || '',
      plan: data.plan || '',
    });
    if (data.soap_note) setGeneratedNote(data.soap_note);
    setLoading(false);
  };

  const saveProgress = async () => {
    await fetch(`/api/encounters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
  };

  const generateSOAP = async () => {
    setGenerating(true);
    await saveProgress();
    try {
      const res = await fetch('/api/ai/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounter_id: parseInt(id) })
      });
      const data = await res.json();
      setGeneratedNote(data.note);
    } catch {
      setGeneratedNote('Error generating note. Please try again.');
    }
    setGenerating(false);
  };

  const proceedToReview = async () => {
    await saveProgress();
    if (!generatedNote) await generateSOAP();
    await fetch(`/api/encounters/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'review' })
    });
    navigate(`/review/${id}`);
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!encounter) return <div className="p-8 text-red-500">Encounter not found</div>;

  const age = getAge(encounter.date_of_birth);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Charting</h1>
          <p className="text-gray-500">
            {encounter.last_name}, {encounter.first_name} &middot; {age}yo {encounter.gender} &middot;{' '}
            {encounter.chief_complaint}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={saveProgress} className="btn-secondary">Save Draft</button>
          <button onClick={proceedToReview} className="btn-primary">
            Complete &amp; Review &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Chart entry */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Physical Examination</h3>
            <textarea
              value={form.exam_notes}
              onChange={e => setForm(f => ({ ...f, exam_notes: e.target.value }))}
              placeholder="General: Alert, oriented. HEENT: Normocephalic. Lungs: CTA bilateral..."
              className="input min-h-[150px] resize-y font-mono text-sm"
            />
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Assessment</h3>
            <textarea
              value={form.assessment}
              onChange={e => setForm(f => ({ ...f, assessment: e.target.value }))}
              placeholder="1. Primary diagnosis or differential&#10;2. Secondary considerations..."
              className="input min-h-[100px] resize-y font-mono text-sm"
            />
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Plan</h3>
            <textarea
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              placeholder="1. Diagnostic workup&#10;2. Medications&#10;3. Follow-up..."
              className="input min-h-[100px] resize-y font-mono text-sm"
            />
          </div>
        </div>

        {/* Right: AI-generated note */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Quick Reference</h3>
            </div>
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium text-gray-700">CC:</span> {encounter.chief_complaint}
              </div>
              <div>
                <span className="font-medium text-gray-700">Vitals:</span>{' '}
                {Object.entries(encounter.vitals || {}).filter(([,v]) => v).map(([k,v]) => `${k.toUpperCase()}: ${v}`).join(' | ')}
              </div>
              <div>
                <span className="font-medium text-gray-700">Allergies:</span>{' '}
                {encounter.allergies?.length ? encounter.allergies.join(', ') : 'NKDA'}
              </div>
              <div>
                <span className="font-medium text-gray-700">Meds:</span>{' '}
                {encounter.medications?.join(', ') || 'None'}
              </div>
            </div>
          </div>

          <AIInsight
            title="AI-Generated SOAP Note"
            content={generatedNote}
            loading={generating}
            onRequest={generateSOAP}
            buttonLabel="Generate SOAP Note"
          />

          <div className="card bg-blue-50 border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Fill in your exam findings, assessment, and plan, then
              click "Generate SOAP Note" to have AI draft a complete note. Review and edit before finalizing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}
