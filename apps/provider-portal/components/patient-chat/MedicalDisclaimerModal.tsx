// Medical Disclaimer Modal Component

import React from 'react';
import { AlertTriangle, Shield, Phone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalDisclaimerModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const MedicalDisclaimerModal: React.FC<MedicalDisclaimerModalProps> = ({
  onAccept,
  onDecline
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold">Important Medical Disclaimer</h2>
              <p className="text-sm opacity-90 mt-1">
                Please read carefully before proceeding
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Disclaimer */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-red-900">
                  This Service Does Not Replace Medical Advice
                </h3>
                <p className="text-sm text-red-800">
                  The AI-powered chat is designed to collect information for your healthcare provider. 
                  It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Phone className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-orange-900">
                  Medical Emergencies
                </h3>
                <p className="text-sm text-orange-800">
                  If you are experiencing a medical emergency, please:
                </p>
                <ul className="list-disc list-inside text-sm text-orange-800 space-y-1 ml-2">
                  <li>Call 911 immediately</li>
                  <li>Go to your nearest emergency room</li>
                  <li>Do NOT use this chat service for emergency situations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Purpose Statement */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">
                  Purpose of This Service
                </h3>
                <p className="text-sm text-blue-800">
                  This AI assistant helps collect your symptoms and medical history to prepare 
                  for your healthcare provider visit. The information gathered will be reviewed 
                  by a qualified medical professional.
                </p>
              </div>
            </div>
          </div>

          {/* Agreement Statement */}
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-700 font-medium">
              By clicking "I Understand and Accept", you acknowledge that:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>You understand this is not a replacement for medical care</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>You will seek emergency care if experiencing a medical emergency</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>The information collected will be shared with your healthcare provider</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>You are providing accurate information to the best of your knowledge</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={onDecline}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-medium"
            >
              I Understand and Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
