import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SOAPNote from '../components/SOAPNote';
import AIInsight from '../components/AIInsight';
import useOverrideTracker from '../hooks/useOverrideTracker';

export default function VisitReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const { trackSuggestions, diffTrack, flush } = useOverrideTracker(parseInt(id));
  const reviewTracked = useRef(false);

  useEffect(() => {
    fetchEncounter();
  }, [id]);

  const fetchEncounter = async () => {
    const res = await fetch(`/api/encounters/${id}`);
    const data = await res.json();
    setEncounter(data);
    setReview(data.ai_review);
    setLoading(false);
  };

  const requestReview = async () => {
    setReviewing(true);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounter_id: parseInt(id) })
      });
      const data = await res.json();
      setReview(data.review);

      // Track each structured suggestion from the quality review
      if (data.review && !data.review.error) {
        if (data.review.icd10_suggestions?.length) {
          trackSuggestions({
            stage: 'quality_review',
            suggestion_type: 'icd10_code',
            items: data.review.icd10_suggestions,
          });
        }
        if (data.review.cpt_suggestions?.length) {
          trackSuggestions({
            stage: 'quality_review',
            suggestion_type: 'cpt_code',
            items: data.review.cpt_suggestions,
          });
        }
        if (data.review.missing?.length) {
          trackSuggestions({
            stage: 'quality_review',
            suggestion_type: 'missing_doc',
            items: data.review.missing,
          });
        }
        if (data.review.quality_flags?.length) {
          trackSuggestions({
            stage: 'quality_review',
            suggestion_type: 'quality_flag',
            items: data.review.quality_flags,
          });
        }
        reviewTracked.current = true;
      }
    } catch {
      setReview({ error: 'Failed to generate review' });
    }
    setReviewing(false);
  };

  const completeEncounter = async () => {
    // On finalization, diff AI-suggested codes against what the encounter
    // actually has.  The encounter's icd10_codes/cpt_codes represent the
    // final accepted set (the clinician may have edited them).
    if (review && !review.error && encounter) {
      const extractCode = str =>
        typeof str === 'string' ? str.split(' - ')[0].trim().toLowerCase() : '';

      diffTrack({
        stage: 'quality_review',
        suggestion_type: 'icd10_code',
        aiItems: review.icd10_suggestions || [],
        finalItems: (encounter.icd10_codes || []).map(c => typeof c === 'string' ? c : ''),
        normalize: extractCode,
      });

      diffTrack({
        stage: 'quality_review',
        suggestion_type: 'cpt_code',
        aiItems: review.cpt_suggestions || [],
        finalItems: (encounter.cpt_codes || []).map(c => typeof c === 'string' ? c : ''),
        normalize: extractCode,
      });
    }
    flush();

    await fetch(`/api/encounters/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    navigate('/');
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!encounter) return <div className="p-8 text-red-500">Encounter not found</div>;

  const age = getAge(encounter.date_of_birth);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visit Review</h1>
          <p className="text-gray-500">
            {encounter.last_name}, {encounter.first_name} &middot; {age}yo {encounter.gender}
          </p>
        </div>
        {encounter.status !== 'completed' && (
          <button onClick={completeEncounter} className="btn-primary">
            Finalize &amp; Complete Visit
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* SOAP Note - 3 columns */}
        <div className="col-span-3 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">SOAP Note</h3>
            <SOAPNote note={encounter.soap_note} />
          </div>
        </div>

        {/* Review sidebar - 2 columns */}
        <div className="col-span-2 space-y-4">
          {/* Quality Review */}
          {review && !review.error ? (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">AI Quality Review</h3>

              {/* Completeness */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Completeness</span>
                  <span className="text-sm font-bold text-attending-700">{review.completeness}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-attending-600 h-2 rounded-full transition-all"
                    style={{ width: review.completeness }}
                  />
                </div>
              </div>

              {/* Missing items */}
              {review.missing?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Missing Documentation</h4>
                  <ul className="space-y-1">
                    {review.missing.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-yellow-500 mt-0.5">!</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ICD-10 Codes */}
              {review.icd10_suggestions?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested ICD-10 Codes</h4>
                  <div className="space-y-1">
                    {review.icd10_suggestions.map((code, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono text-xs">
                          {typeof code === 'string' ? code.split(' - ')[0] : code}
                        </span>
                        <span className="text-gray-600 text-xs">
                          {typeof code === 'string' ? code.split(' - ').slice(1).join(' - ') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CPT Codes */}
              {review.cpt_suggestions?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested CPT Codes</h4>
                  <div className="space-y-1">
                    {review.cpt_suggestions.map((code, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono text-xs">
                          {typeof code === 'string' ? code.split(' - ')[0] : code}
                        </span>
                        <span className="text-gray-600 text-xs">
                          {typeof code === 'string' ? code.split(' - ').slice(1).join(' - ') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Flags */}
              {review.quality_flags?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {review.quality_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-attending-500 mt-0.5">&#x2192;</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Coding Accuracy */}
              {review.coding_accuracy && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Coding:</strong> {review.coding_accuracy}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <AIInsight
              title="Quality & Coding Review"
              content={review?.error}
              loading={reviewing}
              onRequest={requestReview}
              buttonLabel="Run AI Review"
            />
          )}

          {/* Encounter Timeline */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Encounter Timeline</h3>
            <div className="space-y-3 text-sm">
              <TimelineItem label="Started" time={encounter.started_at} />
              {encounter.completed_at && <TimelineItem label="Completed" time={encounter.completed_at} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, time }) {
  const formatted = time ? new Date(time).toLocaleString() : '—';
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 bg-attending-500 rounded-full" />
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-500">{formatted}</span>
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
