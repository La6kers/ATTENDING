// ============================================================
// Imaging Study Card Component
// components/imaging-ordering/ImagingStudyCard.tsx
//
// Displays individual imaging study with selection, priority, and details
// ============================================================

import React from 'react';
import { 
  Brain, Clock, DollarSign, Zap, Shield, AlertTriangle,
  Monitor, Radio, Waves, Heart
} from 'lucide-react';
import type { 
  ImagingStudy, 
  ImagingPriority, 
  ImagingModality,
  SelectedStudy 
} from '../../store/imagingOrderingStore';

interface ImagingStudyCardProps {
  study: ImagingStudy;
  selected: boolean;
  selectedStudy?: SelectedStudy;
  showCosts?: boolean;
  aiRationale?: string;
  onToggle: (code: string) => void;
  onPriorityChange?: (code: string, priority: ImagingPriority) => void;
  onContrastChange?: (code: string, contrast: boolean) => void;
}

const priorityStyles: Record<ImagingPriority, string> = {
  STAT: 'bg-red-100 text-red-800 border-red-200',
  URGENT: 'bg-orange-100 text-orange-800 border-orange-200',
  ROUTINE: 'bg-blue-100 text-blue-800 border-blue-200',
};

const modalityIcons: Record<ImagingModality, React.ReactNode> = {
  CT: <Monitor className="w-4 h-4" />,
  MRI: <Waves className="w-4 h-4" />,
  XRAY: <Radio className="w-4 h-4" />,
  US: <Heart className="w-4 h-4" />,
  NM: <Zap className="w-4 h-4" />,
  FLUORO: <Monitor className="w-4 h-4" />,
  MAMMO: <Shield className="w-4 h-4" />,
  DEXA: <Shield className="w-4 h-4" />,
};

const modalityColors: Record<ImagingModality, string> = {
  CT: 'bg-blue-100 text-blue-700',
  MRI: 'bg-purple-100 text-purple-700',
  XRAY: 'bg-gray-100 text-gray-700',
  US: 'bg-teal-100 text-teal-700',
  NM: 'bg-yellow-100 text-yellow-700',
  FLUORO: 'bg-indigo-100 text-indigo-700',
  MAMMO: 'bg-pink-100 text-pink-700',
  DEXA: 'bg-green-100 text-green-700',
};

export const ImagingStudyCard: React.FC<ImagingStudyCardProps> = ({
  study,
  selected,
  selectedStudy,
  showCosts = true,
  aiRationale,
  onToggle,
  onPriorityChange,
  onContrastChange,
}) => {
  const currentPriority = selectedStudy?.priority || study.defaultPriority;
  const hasContrast = selectedStudy?.contrast ?? study.contrast ?? false;

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        selected ? 'border-indigo-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(study.code)}
            className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-gray-900">{study.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${modalityColors[study.modality]}`}>
                    {modalityIcons[study.modality]}
                    {study.modality}
                  </span>
                  {selectedStudy?.aiRecommended && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{study.description}</p>
                
                {/* Study Details */}
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {study.bodyPart}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{study.durationMinutes} min
                  </span>
                  {study.radiationDose && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Zap className="w-3 h-3" />
                      {study.radiationDose}
                    </span>
                  )}
                  {study.contrast && (
                    <span className="text-blue-600 font-medium">
                      Contrast: {study.contrastType}
                    </span>
                  )}
                </div>
                
                {/* Contraindications Warning */}
                {study.contraindications && study.contraindications.length > 0 && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 rounded">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span><strong>Contraindications:</strong> {study.contraindications.join(', ')}</span>
                  </div>
                )}
                
                {/* Preparation Instructions */}
                {study.preparation && (
                  <div className="mt-2 text-xs text-gray-500 italic">
                    <strong>Prep:</strong> {study.preparation}
                  </div>
                )}
              </div>

              {/* Priority, Cost & Contrast Controls */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {selected && onPriorityChange ? (
                  <select
                    value={currentPriority}
                    onChange={(e) => onPriorityChange(study.code, e.target.value as ImagingPriority)}
                    className={`text-xs font-medium rounded-full px-2 py-1 border cursor-pointer ${priorityStyles[currentPriority]}`}
                  >
                    <option value="STAT">STAT</option>
                    <option value="URGENT">Urgent</option>
                    <option value="ROUTINE">Routine</option>
                  </select>
                ) : (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityStyles[study.defaultPriority]}`}>
                    {study.defaultPriority}
                  </span>
                )}
                
                {showCosts && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {study.cost}
                  </span>
                )}
                
                {/* Contrast Toggle for eligible studies */}
                {selected && study.contrast !== undefined && onContrastChange && (
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasContrast}
                      onChange={(e) => onContrastChange(study.code, e.target.checked)}
                      className="h-3 w-3 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={hasContrast ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                      Contrast
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* AI Rationale */}
            {aiRationale && (
              <div className="mt-3 flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <span className="font-semibold">AI Rationale:</span> {aiRationale}
                </div>
              </div>
            )}

            {/* CPT Code */}
            {study.cptCode && (
              <div className="mt-2 text-xs text-gray-400">
                CPT: {study.cptCode}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagingStudyCard;
