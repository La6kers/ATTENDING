import { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { AIAssistant } from './AIAssistant';
import { MedicationAnalysis } from './MedicationAnalysis';

export const ConversationView: FC = () => {
  const { currentMessage } = useInbox();
  if (!currentMessage) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 rounded-xl bg-slate-50 p-5">
        <div className="grid grid-cols-2 gap-5 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Patient:</span>
            <span className="text-slate-800">{currentMessage.patientName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Age:</span>
            <span className="text-slate-800">{currentMessage.patientDetails.age}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Allergies:</span>
            <span className="text-slate-800">{currentMessage.patientDetails.allergies}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600">Last Visit:</span>
            <span className="text-slate-800">{currentMessage.patientDetails.lastVisit}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-600">Conditions:</span>
          <span className="text-slate-800">{currentMessage.patientDetails.conditions}</span>
        </div>
      </div>

      <AIAssistant />
      
      {currentMessage.type === 'refill' && currentMessage.medications && (
        <MedicationAnalysis medications={currentMessage.medications} />
      )}

      <div className="rounded-xl bg-slate-50 p-5">
        <div className="mb-4 flex justify-between">
          <div className="text-base font-semibold text-slate-800">
            {currentMessage.type === 'email' && '?? Email Message'}
            {currentMessage.type === 'lab' && '?? Lab Results'}
            {currentMessage.type === 'phone' && '?? Phone Message'}
            {currentMessage.type === 'refill' && '?? Refill Request'}
          </div>
          <div className="text-sm text-slate-500">{currentMessage.time}</div>
        </div>
        
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 font-semibold text-slate-800">{currentMessage.patientName}</div>
          <div className="text-slate-600">{currentMessage.content}</div>
        </div>
      </div>
    </div>
  );
};