import type { FC } from 'react';
import { Pill, AlertTriangle, Info } from 'lucide-react';

interface MedicationAnalysisProps {
  medications: string[];
}

export const MedicationAnalysis: FC<MedicationAnalysisProps> = ({ medications }) => {
  return (
    <div className="mb-6 rounded-xl bg-amber-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Pill className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-slate-800">Medication Analysis</h3>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-white/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500" />
            <h4 className="font-medium text-slate-700">Requested Medications</h4>
          </div>
          <ul className="space-y-2">
            {medications.map((med, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {med}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-white/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="font-medium text-slate-700">Important Considerations</h4>
          </div>
          <ul className="space-y-1 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              Check for drug interactions with current medications
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              Verify dosage appropriateness for patient's condition
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              Confirm insurance coverage and prior authorization if needed
            </li>
          </ul>
        </div>

        <div className="flex gap-2">
          <button className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">
            Approve Refill
          </button>
          <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
            Modify Request
          </button>
          <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
            Deny Request
          </button>
        </div>
      </div>
    </div>
  );
};
