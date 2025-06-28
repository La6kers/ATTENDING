import { FC } from 'react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface Lab {
  test: string;
  value: string;
  date: string;
  normal: string;
}

interface MedicationDetails {
  name: string;
  dose: string;
  frequency: string;
  startDate: string;
  indication: string;
  adherence: string;
  lastRefill: string;
}

interface Props {
  medications: string[];
}

export const MedicationAnalysis: FC<Props> = ({ medications }) => {
  // Mock data - in real app, this would come from your backend
  const mockMedData: Record<string, MedicationDetails> = {
    'Metformin': {
      name: 'Metformin',
      dose: '500mg',
      frequency: 'twice daily',
      startDate: '2023-01-15',
      indication: 'Type 2 Diabetes',
      adherence: '95%',
      lastRefill: '2025-05-20',
    },
    'Lisinopril': {
      name: 'Lisinopril',
      dose: '10mg',
      frequency: 'once daily',
      startDate: '2022-08-10',
      indication: 'Hypertension',
      adherence: '88%',
      lastRefill: '2025-05-15',
    },
  };

  const mockLabs: Record<string, Lab[]> = {
    'Metformin': [
      { test: 'A1C', value: '7.2%', date: '2025-06-01', normal: '< 7.0%' },
      { test: 'Glucose', value: '145 mg/dL', date: '2025-06-01', normal: '70-100 mg/dL' },
    ],
    'Lisinopril': [
      { test: 'Potassium', value: '4.1 mEq/L', date: '2025-05-28', normal: '3.5-5.0 mEq/L' },
      { test: 'Creatinine', value: '1.1 mg/dL', date: '2025-05-28', normal: '0.6-1.2 mg/dL' },
    ],
  };

  const handleRefill = (medication: string, action: 'approve' | 'modify' | 'deny') => {
    const actions = {
      approve: 'Refill approved and sent to pharmacy',
      modify: 'Opening prescription editor for dose modification',
      deny: 'Visit required - scheduling notification sent',
    };

    toast({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Refill`,
      description: actions[action],
    });
  };

  const isLabNormal = (lab: Lab) => {
    const value = parseFloat(lab.value);
    const normal = lab.normal;
    
    if (normal.includes('<')) {
      const threshold = parseFloat(normal.replace(/[<>\s%mg\/dLmEq\/L]/g, ''));
      return value < threshold;
    } else if (normal.includes('>')) {
      const threshold = parseFloat(normal.replace(/[<>\s%mg\/dLmEq\/L]/g, ''));
      return value > threshold;
    } else if (normal.includes('-')) {
      const [min, max] = normal.split('-').map(v => parseFloat(v));
      return value >= min && value <= max;
    }
    return true;
  };

  return (
    <div className="mb-6 rounded-xl bg-blue-50 border border-blue-500 p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-blue-200 pb-3">
        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500 text-white">
          ??
        </div>
        <div className="text-lg font-semibold text-blue-900">AI Medication Analysis</div>
      </div>

      {medications.map((medName) => {
        const medication = mockMedData[medName];
        if (!medication) return null;

        const relevantLabs = mockLabs[medName] || [];

        return (
          <div key={medName} className="mb-4 rounded-lg bg-white p-4 border-l-4 border-blue-500">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">{medication.name}</div>
              <div className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                {medication.dose} {medication.frequency}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="text-sm">
                <span className="font-medium text-slate-600">Indication:</span>{' '}
                <span className="text-slate-800">{medication.indication}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-slate-600">Adherence:</span>{' '}
                <span className="text-slate-800">{medication.adherence}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-slate-600">Last Refill:</span>{' '}
                <span className="text-slate-800">{medication.lastRefill}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-slate-600">Start Date:</span>{' '}
                <span className="text-slate-800">{medication.startDate}</span>
              </div>
            </div>

            {relevantLabs.length > 0 && (
              <div className="mb-3 rounded-lg bg-slate-50 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  ?? Relevant Lab Values
                </div>
                {relevantLabs.map((lab) => (
                  <div key={lab.test} className="flex items-center justify-between py-1.5 border-b border-slate-200 last:border-0">
                    <span className="text-sm text-slate-600">
                      {lab.test} ({lab.date})
                    </span>
                    <span className={cn(
                      'text-sm font-medium',
                      isLabNormal(lab) ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {lab.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleRefill(medication.name, 'approve')}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                ? Approve Refill
              </button>
              <button
                onClick={() => handleRefill(medication.name, 'modify')}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                ?? Modify Dose
              </button>
              <button
                onClick={() => handleRefill(medication.name, 'deny')}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                ? Require Visit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};