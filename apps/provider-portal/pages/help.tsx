// =============================================================================
// Help & Support Page
// apps/provider-portal/pages/help.tsx
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ProviderShell } from '@/components/layout/ProviderShell';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Phone,
  Mail,
  Video,
  FileText,
  Search,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  PlayCircle,
  Lightbulb,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  Users,
  Activity,
  TestTube,
  FileImage,
  Pill,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface GuideItem {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  duration?: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I review a COMPASS assessment?',
    answer: 'Navigate to the Assessments page from the main navigation. Click on any pending assessment to view the full patient interview, AI-generated summary, and recommended actions. You can approve, modify, or escalate the assessment from there.',
  },
  {
    question: 'What do the urgency levels mean?',
    answer: 'Critical (red): Requires immediate attention, potential emergency. Urgent (orange): Needs review within hours. Routine (green): Can be addressed during normal workflow. The AI assigns these based on symptom analysis and red flag detection.',
  },
  {
    question: 'How does the AI generate recommendations?',
    answer: 'ATTENDING AI uses BioMistral-7B, a medical-specialized language model, combined with evidence-based clinical guidelines. All recommendations are suggestions that require physician review and approval before being acted upon.',
  },
  {
    question: 'Can I customize the lab order templates?',
    answer: 'Yes! Go to Settings > Clinical Preferences to modify your default lab panels, preferred imaging protocols, and medication favorites. These preferences will be reflected in AI recommendations.',
  },
  {
    question: 'How do I handle a critical red flag alert?',
    answer: 'When a red flag is detected, you\'ll receive an immediate notification. Click the alert to view the patient details and recommended emergency protocol. You can initiate the protocol or document your clinical reasoning for an alternative approach.',
  },
  {
    question: 'Is patient data secure and HIPAA compliant?',
    answer: 'Yes. ATTENDING AI uses 256-bit encryption, role-based access control, and comprehensive audit logging. All data is stored in HIPAA-compliant infrastructure with BAA agreements in place.',
  },
];

const guides: GuideItem[] = [
  {
    title: 'Getting Started with ATTENDING AI',
    description: 'Learn the basics of navigating the provider portal',
    icon: PlayCircle,
    href: '#',
    duration: '5 min',
  },
  {
    title: 'Reviewing Patient Assessments',
    description: 'How to efficiently review COMPASS assessments',
    icon: Activity,
    href: '#',
    duration: '8 min',
  },
  {
    title: 'Ordering Labs with AI Assistance',
    description: 'Using AI recommendations for lab orders',
    icon: TestTube,
    href: '#',
    duration: '6 min',
  },
  {
    title: 'Imaging Orders & Protocols',
    description: 'Evidence-based imaging order workflows',
    icon: FileImage,
    href: '#',
    duration: '7 min',
  },
  {
    title: 'E-Prescribing & Drug Interactions',
    description: 'Safe medication ordering with interaction checks',
    icon: Pill,
    href: '#',
    duration: '10 min',
  },
  {
    title: 'Managing Referrals',
    description: 'Creating and tracking specialist referrals',
    icon: Users,
    href: '#',
    duration: '5 min',
  },
];

const quickTips = [
  { icon: Zap, text: 'Press Ctrl+K to quickly search patients and orders' },
  { icon: Shield, text: 'All AI suggestions require physician approval before action' },
  { icon: Clock, text: 'Critical alerts auto-refresh every 30 seconds' },
  { icon: Lightbulb, text: 'Hover over any AI recommendation to see the clinical rationale' },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Help & Support | ATTENDING AI</title>
      </Head>

      <ProviderShell contextBadge="Help" currentPage="help">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <nav className="text-sm text-gray-500 mb-2">
              <Link href="/" className="hover:text-teal-600">Dashboard</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">Help & Support</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <HelpCircle className="w-8 h-8 text-teal-600" />
              Help & Support
            </h1>
            <p className="text-gray-600 mt-2">Find answers, learn features, and get assistance</p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
              />
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 mb-8 text-white">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Quick Tips
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickTips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div key={index} className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{tip.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <a
              href="mailto:support@attending.ai"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email Support</p>
                <p className="text-sm text-gray-500">support@attending.ai</p>
              </div>
            </a>

            <a
              href="tel:+18001234567"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone Support</p>
                <p className="text-sm text-gray-500">1-800-123-4567</p>
              </div>
            </a>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border transition-all text-left ${chatOpen ? 'border-teal-400 shadow-md ring-2 ring-teal-100' : 'border-gray-200 hover:border-teal-300 hover:shadow-md'}`}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Live Chat</p>
                <p className="text-sm text-gray-500">{chatOpen ? 'Chat open below' : 'Chat with support team'}</p>
              </div>
            </button>
          </div>

          {/* Inline Chat Widget */}
          {chatOpen && (
            <div className="bg-white rounded-2xl shadow-lg border border-teal-200 mb-8 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Support Chat</p>
                    <p className="text-teal-100 text-xs">Typically replies in under 2 minutes</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white text-lg font-bold px-2">&times;</button>
              </div>
              <div className="p-4 space-y-4 max-h-80 overflow-y-auto bg-gray-50">
                {/* Pre-filled conversation */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-md">
                    <p className="text-sm text-gray-800">Hello, Dr. Reed! Welcome to ATTENDING AI support. How can I help you today?</p>
                    <p className="text-xs text-gray-400 mt-1">Sarah - Support Team &middot; 2:31 PM</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="bg-teal-600 rounded-xl rounded-tr-none p-3 shadow-sm max-w-md">
                    <p className="text-sm text-white">Hi, I have a question about customizing my lab order templates. Where do I find that setting?</p>
                    <p className="text-xs text-teal-200 mt-1">You &middot; 2:32 PM</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-md">
                    <p className="text-sm text-gray-800">Great question! You can customize your lab templates under <span className="font-medium text-teal-700">Settings &gt; Clinical Preferences &gt; Lab Panels</span>. From there you can add, remove, or reorder tests in each panel. Would you like me to walk you through it?</p>
                    <p className="text-xs text-gray-400 mt-1">Sarah - Support Team &middot; 2:33 PM</p>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Video Guides */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-teal-600" />
                Video Tutorials
              </h2>
              <button className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Getting Started', duration: '5:30', description: 'Overview of the ATTENDING AI provider portal, navigation, and key features.', gradient: 'from-teal-500 to-teal-700' },
                { title: 'Navigating Encounters', duration: '8:15', description: 'How to view patient encounters, review timelines, and manage visit notes.', gradient: 'from-cyan-500 to-teal-600' },
                { title: 'Using AI Differential', duration: '7:45', description: 'Leverage AI-powered differential diagnosis suggestions during encounters.', gradient: 'from-teal-600 to-emerald-600' },
                { title: 'Ordering Labs & Imaging', duration: '6:20', description: 'Step-by-step guide to ordering labs and imaging with AI recommendations.', gradient: 'from-emerald-500 to-teal-600' },
                { title: 'Reading COMPASS Assessments', duration: '9:00', description: 'Review patient-reported assessments collected via the COMPASS chatbot.', gradient: 'from-teal-700 to-cyan-600' },
                { title: 'Ambient Scribe Overview', duration: '4:50', description: 'How the ambient scribe captures and summarizes clinical conversations.', gradient: 'from-cyan-600 to-teal-500' },
              ].map((video, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedVideo(selectedVideo === index ? null : index)}
                  className="flex flex-col bg-gray-50 rounded-xl hover:bg-teal-50 transition-colors text-left group overflow-hidden"
                >
                  {/* Thumbnail placeholder */}
                  <div className={`relative w-full h-32 bg-gradient-to-br ${video.gradient} flex items-center justify-center`}>
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      {video.duration}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1">{video.title}</h3>
                    <p className="text-sm text-gray-500">{video.description}</p>
                    {selectedVideo === index && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="bg-teal-50 rounded-lg p-3 text-xs text-teal-700">
                          <p className="font-medium mb-1">Video preview</p>
                          <p className="text-teal-600">This tutorial is available in the ATTENDING AI Learning Center. Contact your administrator for access credentials.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Book className="w-5 h-5 text-teal-600" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedFAQ === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-4 pb-4 text-gray-600 border-t border-gray-100 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}

              {filteredFAQs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
          </div>

          {/* Documentation Links */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Documentation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="#"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Book className="w-5 h-5 text-teal-600" />
                  <span className="font-medium text-gray-900">User Guide</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />
              </a>

              <a
                href="#"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-teal-600" />
                  <span className="font-medium text-gray-900">Security & Privacy</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />
              </a>

              <a
                href="#"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span className="font-medium text-gray-900">Clinical Guidelines</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />
              </a>

              <a
                href="#"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-teal-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <span className="font-medium text-gray-900">Release Notes</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />
              </a>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              System Status
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">ATTENDING AI Platform</span>
                </div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">COMPASS Patient Portal</span>
                </div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">BioMistral AI Services</span>
                </div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-900">EHR Integration</span>
                </div>
                <span className="text-sm font-medium text-green-600">Operational</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4 text-center">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </ProviderShell>
    </>
  );
}
