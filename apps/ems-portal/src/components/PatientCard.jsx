import { useNavigate } from 'react-router-dom';

const statusLabels = {
  intake: 'In Intake',
  waiting: 'Waiting',
  in_progress: 'In Progress',
  charting: 'Charting',
  review: 'In Review',
  completed: 'Completed',
};

const statusActions = {
  waiting: { label: 'Start Encounter', path: (id) => `/encounter/${id}` },
  in_progress: { label: 'Continue Encounter', path: (id) => `/encounter/${id}` },
  charting: { label: 'Continue Charting', path: (id) => `/charting/${id}` },
  review: { label: 'View Review', path: (id) => `/review/${id}` },
  completed: { label: 'View Summary', path: (id) => `/review/${id}` },
};

export default function PatientCard({ encounter }) {
  const navigate = useNavigate();
  const age = getAge(encounter.date_of_birth);
  const action = statusActions[encounter.status];

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            {encounter.last_name}, {encounter.first_name}
          </h3>
          <p className="text-gray-500 text-sm">
            {age}yo {encounter.gender} &middot; Encounter #{encounter.id}
          </p>
        </div>
        <span className={`badge badge-${encounter.status}`}>
          {statusLabels[encounter.status]}
        </span>
      </div>

      {encounter.chief_complaint && (
        <p className="mt-3 text-sm">
          <span className="font-medium text-gray-700">CC:</span>{' '}
          {encounter.chief_complaint}
        </p>
      )}

      {encounter.vitals && Object.keys(encounter.vitals).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {encounter.vitals.bp && <VitalBadge label="BP" value={encounter.vitals.bp} />}
          {encounter.vitals.hr && <VitalBadge label="HR" value={encounter.vitals.hr} />}
          {encounter.vitals.temp && <VitalBadge label="T" value={encounter.vitals.temp} />}
          {encounter.vitals.spo2 && <VitalBadge label="SpO2" value={encounter.vitals.spo2} />}
        </div>
      )}

      {action && (
        <button
          onClick={() => navigate(action.path(encounter.id))}
          className={`mt-4 w-full ${encounter.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function VitalBadge({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
      <span className="font-medium text-gray-600">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function getAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}
