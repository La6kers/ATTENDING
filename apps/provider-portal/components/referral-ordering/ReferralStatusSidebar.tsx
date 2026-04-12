// ============================================================
// Referral Status Sidebar Component
// apps/provider-portal/components/referral-ordering/ReferralStatusSidebar.tsx
// ============================================================

import {
  CheckCircle,
  Calendar,
  FileText,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import type { ActiveReferral, ReferralStatusUpdate } from './types';

interface ReferralStatusSidebarProps {
  statusUpdates: ReferralStatusUpdate[];
  activeReferrals: ActiveReferral[];
  onViewAllReferrals?: () => void;
  onInitiateAppeal?: (referralId: string) => void;
  deniedReferral?: {
    id: string;
    specialty: string;
    reason: string;
  } | null;
}

export function ReferralStatusSidebar({
  statusUpdates,
  activeReferrals,
  onViewAllReferrals,
  onInitiateAppeal,
  deniedReferral,
}: ReferralStatusSidebarProps) {
  return (
    <aside className="space-y-4">
      {/* Status Tracking */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-teal-600" />
          Referral Status Tracking
        </h3>
        
        <div className="space-y-3">
          {statusUpdates.map((update, _index) => (
            <div key={update.id} className="flex items-start gap-3">
              <div className={`
                w-3 h-3 rounded-full mt-1 flex-shrink-0
                ${update.completed 
                  ? 'bg-green-500' 
                  : update.status === 'PENDING' 
                    ? 'bg-yellow-500' 
                    : 'bg-gray-300'
                }
              `} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{update.message}</p>
                {update.timestamp && (
                  <p className="text-xs text-gray-400">
                    {new Date(update.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Patient Instructions */}
        <div className="mt-4 bg-blue-50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-800 mb-2">Patient Instructions</h4>
          <ul className="space-y-1">
            {[
              'Patient will receive a call within 24-48 hours',
              'Bring insurance card and photo ID',
              'Prepare list of current medications',
              'Insurance authorization may take 3-5 days',
              'Contact provider directly if no call received',
            ].map((instruction, i) => (
              <li key={i} className="text-xs text-blue-700 flex items-start gap-1">
                <span className="text-blue-500">→</span>
                {instruction}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active Referrals */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-teal-600" />
          Active Referrals ({activeReferrals.length})
        </h3>
        
        <div className="space-y-2">
          {activeReferrals.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No active referrals</p>
          ) : (
            activeReferrals.map((referral) => (
              <div key={referral.id} className="flex items-start gap-3">
                <div className={`
                  w-3 h-3 rounded-full mt-1 flex-shrink-0
                  ${referral.status === 'COMPLETED' || referral.status === 'SCHEDULED' 
                    ? 'bg-green-500' 
                    : referral.status === 'PENDING' 
                      ? 'bg-yellow-500' 
                      : 'bg-gray-300'
                  }
                `} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{referral.specialtyName}</p>
                  <p className="text-xs text-gray-500">
                    {referral.status === 'SCHEDULED' && referral.appointmentDate
                      ? `Appt: ${referral.appointmentDate}`
                      : referral.status === 'PENDING'
                        ? 'Pending Authorization'
                        : referral.status
                    }
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onViewAllReferrals}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors"
        >
          View All Referrals
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Appeal Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-teal-600" />
          Appeal Assistance
        </h3>
        
        <p className="text-xs text-gray-500 mb-3">
          If a referral is denied, we'll help you appeal the decision.
        </p>

        {deniedReferral ? (
          <div className="bg-yellow-50 rounded-lg p-3 mb-3">
            <h4 className="text-xs font-semibold text-yellow-800 mb-1">Recent Denial</h4>
            <p className="text-xs text-yellow-700 mb-2">
              {deniedReferral.specialty} referral denied - {deniedReferral.reason}
            </p>
            <button
              onClick={() => onInitiateAppeal?.(deniedReferral.id)}
              className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 transition-colors"
            >
              Start Appeal Process
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-xs text-gray-600">No denied referrals</p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-semibold">Appeal Timeline:</p>
          <p>• Initial review: 3-5 days</p>
          <p>• Peer review: 7-10 days</p>
          <p>• Final decision: 14-21 days</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl shadow-sm p-4 text-white">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Quick Stats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-2xl font-bold">{activeReferrals.length}</p>
            <p className="text-xs text-teal-200">Active</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-2xl font-bold">
              {activeReferrals.filter(r => r.status === 'PENDING').length}
            </p>
            <p className="text-xs text-teal-200">Pending</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-2xl font-bold">
              {activeReferrals.filter(r => r.status === 'SCHEDULED').length}
            </p>
            <p className="text-xs text-teal-200">Scheduled</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 text-center">
            <p className="text-2xl font-bold">
              {activeReferrals.filter(r => r.status === 'COMPLETED').length}
            </p>
            <p className="text-xs text-teal-200">Completed</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default ReferralStatusSidebar;
