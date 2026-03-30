// =============================================================================
// COMPASS Admin - Check-in Setup
// apps/compass-admin/pages/settings/checkin.tsx
//
// Generate patient check-in links, QR codes for waiting rooms,
// and configure the kiosk mode for tablet deployment.
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  QrCode,
  Link2,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Printer,
  ExternalLink,
  Eye,
  Settings,
  Palette,
} from 'lucide-react';
import { CompassAdminShell } from '@/components/layout/CompassAdminShell';
import { QRCodeSVG } from 'qrcode.react';

// =============================================================================
// Main Page
// =============================================================================

export default function CheckinSetupPage() {
  const [clinicSlug, setClinicSlug] = useState('my-clinic');
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Welcome! Please complete your health check-in before your visit.'
  );
  const [copied, setCopied] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://compass.attending.ai';

  // Patient-facing check-in URL
  const checkinUrl = `${baseUrl}/compass/checkin/${clinicSlug}`;

  // Kiosk URL (full-screen, no nav)
  const kioskUrl = `${checkinUrl}?mode=kiosk`;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {
      console.warn('Failed to copy to clipboard');
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>COMPASS Check-in QR Code</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 60px; }
            h1 { font-size: 32px; color: #115e59; margin-bottom: 8px; }
            p { font-size: 18px; color: #555; margin-bottom: 40px; max-width: 400px; margin-left: auto; margin-right: auto; }
            .qr { margin: 0 auto 30px; }
            .url { font-size: 14px; color: #888; font-family: monospace; }
            .footer { margin-top: 60px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>📋 Scan to Check In</h1>
          <p>${welcomeMessage}</p>
          <div class="qr">${printContent.querySelector('svg')?.outerHTML || ''}</div>
          <p class="url">${checkinUrl}</p>
          <div class="footer">Powered by COMPASS — ATTENDING AI</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <Head>
        <title>Check-in Setup | COMPASS Admin</title>
      </Head>

      <CompassAdminShell title="Check-in Setup">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Patient Check-in Setup</h1>
          <p className="text-sm text-gray-500 mb-8">
            Generate a check-in link and QR code for patients to complete their COMPASS assessment.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Configuration */}
            <div className="space-y-6">
              {/* Clinic Slug */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-5 h-5 text-compass-600" />
                  <h2 className="font-semibold text-gray-900">Check-in Link</h2>
                </div>

                <label className="block mb-3">
                  <span className="text-sm text-gray-600">Clinic identifier</span>
                  <div className="flex items-center gap-0 mt-1">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-l-lg border border-r-0 border-gray-200 whitespace-nowrap">
                      /compass/checkin/
                    </span>
                    <input
                      type="text"
                      value={clinicSlug}
                      onChange={(e) => setClinicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg text-sm focus:ring-2 focus:ring-compass-300 focus:border-compass-400 outline-none"
                      placeholder="my-clinic"
                    />
                  </div>
                </label>

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 truncate border border-gray-200">
                    {checkinUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(checkinUrl)}
                    className="p-2 bg-compass-50 border border-compass-200 rounded-lg hover:bg-compass-100 transition-colors"
                    title="Copy link"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-compass-600" />}
                  </button>
                  <a
                    href={checkinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-compass-50 border border-compass-200 rounded-lg hover:bg-compass-100 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4 text-compass-600" />
                  </a>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-5 h-5 text-compass-600" />
                  <h2 className="font-semibold text-gray-900">Welcome Message</h2>
                </div>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-compass-300 focus:border-compass-400 outline-none resize-none"
                  placeholder="Welcome message shown to patients..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  This appears on the check-in page before patients start their assessment.
                </p>
              </div>

              {/* Kiosk Mode */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-compass-600" />
                    <h2 className="font-semibold text-gray-900">Kiosk Mode</h2>
                  </div>
                  <button
                    onClick={() => setKioskMode(!kioskMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      kioskMode ? 'bg-compass-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      kioskMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Full-screen mode for waiting room tablets. Removes navigation, auto-resets after submission.
                </p>
                {kioskMode && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 truncate border border-gray-200">
                      {kioskUrl}
                    </div>
                    <button
                      onClick={() => handleCopy(kioskUrl)}
                      className="p-2 bg-compass-50 border border-compass-200 rounded-lg hover:bg-compass-100 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-compass-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: QR Code Preview */}
            <div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center sticky top-24" ref={printRef}>
                <h2 className="text-lg font-bold text-compass-800 mb-1">📋 Scan to Check In</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">{welcomeMessage}</p>

                <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-gray-100 mb-4">
                  <QRCodeSVG value={checkinUrl} size={220} fgColor="#115e59" />
                </div>

                <p className="text-xs text-gray-400 font-mono mb-6">{checkinUrl}</p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2.5 bg-compass-600 text-white rounded-lg font-medium hover:bg-compass-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print for Waiting Room
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Powered by <strong className="text-compass-600">COMPASS</strong> — ATTENDING AI
                  </p>
                </div>
              </div>

              {/* Device Preview Note */}
              <div className="mt-4 bg-compass-50 rounded-xl border border-compass-200 p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-compass-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-compass-800">Works on any device</p>
                    <p className="text-xs text-compass-600 mt-1">
                      COMPASS check-in is a PWA. Patients can use their phone, a waiting room tablet,
                      or a clinic kiosk. The assessment is optimized for mobile and works offline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CompassAdminShell>
    </>
  );
}
