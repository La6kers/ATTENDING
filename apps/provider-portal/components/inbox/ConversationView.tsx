import { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { AIAssistant } from './AIAssistant';
import { MedicationAnalysis } from './MedicationAnalysis';
import { Mail, Flask, Phone, Pill } from 'lucide-react';

export const ConversationView: FC = () => {
  const { currentMessage } = useInbox();
  if (!currentMessage) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 rounded-xl bg-slate-50 p-5">
        <div className="grid grid-cols-2 gap-5 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Patient:</span>
            <span className="text-slate-800">{currentMessage.patientDetails.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Age:</span>
            <span className="text-slate-800">{currentMessage.patientDetails.age}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Allergies:</span>
            <span className="text-slate-800">{currentMessage.patientDetails.allergies.join(', ')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Last Visit:</span>
            <span className="text-slate-800">{currentMessage.patientDetails.lastVisit}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-600">Conditions:</span>
          <span className="text-slate-800">{currentMessage.patientDetails.conditions.join(', ')}</span>
        </div>
      </div>

      <AIAssistant />
      
      {currentMessage.type === 'refill' && currentMessage.medications && (
        <MedicationAnalysis medications={currentMessage.medications} />
      )}

      <div className="rounded-xl bg-slate-50 p-5">
        <div className="mb-4 flex justify-between">
          <div className="text-base font-semibold text-slate-800 flex items-center gap-2">
            {currentMessage.type === 'email' && <><Mail className="w-4 h-4" /> Email Message</>}
            {currentMessage.type === 'lab' && <><Flask className="w-4 h-4" /> Lab Results</>}
            {currentMessage.type === 'phone' && <><Phone className="w-4 h-4" /> Phone Message</>}
            {currentMessage.type === 'refill' && <><Pill className="w-4 h-4" /> Refill Request</>}
          </div>
          <div className="text-sm text-slate-500">{new Date(currentMessage.createdAt).toLocaleString()}</div>
        </div>
        
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 font-semibold text-slate-800">{currentMessage.subject}</div>
          <div className="text-slate-600 whitespace-pre-wrap">{currentMessage.content}</div>
        </div>
      </div>
    </div>
  );
};
