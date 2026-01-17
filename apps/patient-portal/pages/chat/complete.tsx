// COMPASS Assessment Complete Page
// Patient Portal: apps/patient-portal/pages/chat/complete.tsx

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  CheckCircle, 
  Clock, 
  Home, 
  AlertCircle,
  Calendar
} from 'lucide-react';

export default function AssessmentCompletePage() {
  const router = useRouter();
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<string>('');

  useEffect(() => {
    // Simulate queue position
    setQueuePosition(Math.floor(Math.random() * 5) + 1);
    const waitMinutes = Math.floor(Math.random() * 20) + 10;
    setEstimatedWait(`${waitMinutes} minutes`);
  }, []);

  return (
    <>
      <Head>
        <title>Assessment Submitted | ATTENDING Patient Portal</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              Assessment Submitted Successfully
            </h1>
            
            <p className="text-gray-600 mb-8">
              Your COMPASS assessment has been sent to your healthcare provider for review. 
              You will be contacted shortly.
            </p>

            {/* Queue Status */}
            <div className="bg-indigo-50 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Clock className="h-6 w-6 text-indigo-600" />
                <h2 className="text-lg font-semibold text-indigo-800">Review Status</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    #{queuePosition || '-'}
                  </div>
                  <div className="text-sm text-indigo-600/80">Queue Position</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    {estimatedWait || '-'}
                  </div>
                  <div className="text-sm text-indigo-600/80">Est. Wait Time</div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="text-left mb-8">
              <h3 className="font-semibold text-gray-800 mb-4">What happens next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-sm font-bold">1</span>
                  </div>
                  <p className="text-gray-600">A healthcare provider will review your assessment</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-sm font-bold">2</span>
                  </div>
                  <p className="text-gray-600">You may receive a call or message for follow-up questions</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-sm font-bold">3</span>
                  </div>
                  <p className="text-gray-600">Treatment recommendations will be provided</p>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                <Home className="h-5 w-5" />
                <span>Return Home</span>
              </button>
              <button
                onClick={() => router.push('/appointments')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
              >
                <Calendar className="h-5 w-5" />
                <span>View Appointments</span>
              </button>
            </div>
          </div>

          {/* Emergency Notice */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-300" />
              <p className="text-white/90 text-sm">
                If your symptoms worsen or you experience an emergency, call{' '}
                <a href="tel:911" className="font-bold underline">911</a>{' '}
                immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
