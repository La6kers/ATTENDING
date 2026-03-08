// ============================================================
// ATTENDING AI - Specialty Environment Selector
// apps/provider-portal/pages/specialty/index.tsx
//
// Lets providers choose their clinical environment.
// Connected to ClinicEnvironment schema — each tile maps
// to a specialtyCode and loads that environment's config.
// ============================================================

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ProviderShell from '../../components/layout/ProviderShell';
import {
  Heart,
  Baby,
  Stethoscope,
  Eye,
  Brain,
  Bone,
  Scan,
  Syringe,
  Leaf,
  Activity,
  Shield,
  Ribbon,
  type LucideIcon,
} from 'lucide-react';

// ============================================================
// Environment Options
// ============================================================

interface EnvironmentOption {
  code: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  ready: boolean;
}

const ENVIRONMENTS: EnvironmentOption[] = [
  {
    code: 'PCP',
    name: 'Primary Care',
    description: 'General medicine, wellness visits, chronic disease management',
    icon: Stethoscope,
    href: '/',
    ready: true,
  },
  {
    code: 'CARDS',
    name: 'Cardiology',
    description: 'Cardiac metrics, EKG interpretation, risk stratification',
    icon: Heart,
    href: '/specialty/cardiology',
    ready: true,
  },
  {
    code: 'PEDS',
    name: 'Pediatrics',
    description: 'Growth charts, immunizations, developmental milestones',
    icon: Baby,
    href: '/specialty/pediatrics',
    ready: false,
  },
  {
    code: 'DERM',
    name: 'Dermatology',
    description: 'Skin lesion analysis, dermoscopy, visual AI triage',
    icon: Eye,
    href: '/specialty/dermatology',
    ready: true,
  },
  {
    code: 'GYN',
    name: 'OB/GYN',
    description: 'Prenatal care, cervical screening, contraception, pelvic floor',
    icon: Ribbon,
    href: '/specialty/gynecology',
    ready: true,
  },
  {
    code: 'NEURO',
    name: 'Neurology',
    description: 'Neuro exams, EEG, stroke protocols, cognitive assessments',
    icon: Brain,
    href: '/specialty/neurology',
    ready: false,
  },
  {
    code: 'ORTHO',
    name: 'Orthopedics',
    description: 'MSK imaging, fracture management, joint assessments',
    icon: Bone,
    href: '/specialty/orthopedics',
    ready: false,
  },
  {
    code: 'URO',
    name: 'Urology',
    description: 'PSA tracking, urodynamics, stone management',
    icon: Activity,
    href: '/specialty/urology',
    ready: true,
  },
  {
    code: 'ONCO',
    name: 'Oncology',
    description: 'Treatment protocols, tumor markers, staging',
    icon: Scan,
    href: '/specialty/oncology',
    ready: false,
  },
  {
    code: 'ENDO',
    name: 'Endocrinology',
    description: 'Diabetes management, thyroid, hormonal panels',
    icon: Syringe,
    href: '/specialty/endocrinology',
    ready: true,
  },
  {
    code: 'ID',
    name: 'Infectious Disease',
    description: 'Antimicrobial stewardship, culture tracking, HIV/HCV management',
    icon: Shield,
    href: '/specialty/infectious-disease',
    ready: true,
  },
  {
    code: 'NURS',
    name: 'Nurse Clinic',
    description: 'Triage workflows, vitals monitoring, care coordination',
    icon: Leaf,
    href: '/specialty/nurse-clinic',
    ready: false,
  },
];

// ============================================================
// Page
// ============================================================

export default function SpecialtySelector() {
  return (
    <ProviderShell contextBadge="Environment" currentPage="">
      <Head>
        <title>ATTENDING | Choose Specialty Environment</title>
      </Head>

      <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 110px)', padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0C3547', margin: 0 }}>
              Choose Your Clinical Environment
            </h1>
            <p style={{ fontSize: 15, color: '#64748b', marginTop: 8 }}>
              Select a specialty to load the optimized dashboard, AI prompts, and clinical workflows for that practice area.
            </p>
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {ENVIRONMENTS.map((env) => {
              const Icon = env.icon;
              const Card = env.ready ? Link : 'div';

              return (
                <Card
                  key={env.code}
                  href={env.ready ? env.href : '#'}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0',
                    cursor: env.ready ? 'pointer' : 'default',
                    opacity: env.ready ? 1 : 0.6,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
                    if (!env.ready) return;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(12,53,71,0.12)';
                    e.currentTarget.style.borderColor = '#1A8FA8';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #1A8FA8, #0C3547)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: 24, height: 24, color: '#FFFFFF' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0C3547', margin: 0 }}>{env.name}</h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: env.ready ? '#059669' : '#94a3b8',
                          background: env.ready ? '#dcfce7' : '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        {env.ready ? 'Available' : 'Coming Soon'}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{env.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </ProviderShell>
  );
}
