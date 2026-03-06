import { useState, useEffect } from 'react';
import Head from 'next/head';

/**
 * Population Health Dashboard
 * 
 * Organization-level health metrics and risk stratification.
 * Helps identify care gaps and high-risk patient cohorts.
 */

interface PopulationMetrics {
  totalPatients: number;
  activeEncounters: number;
  riskDistribution: { level: string; count: number; percentage: number; color: string }[];
  careGaps: { condition: string; patientsAtRisk: number; screened: number; gapPercentage: number }[];
  chronicConditions: { condition: string; prevalence: number; controlled: number; uncontrolled: number }[];
  demographics: { ageGroup: string; count: number; percentage: number }[];
  sdohFactors: { factor: string; affectedPatients: number; percentage: number }[];
  qualityMeasures: { measure: string; target: number; current: number; trend: 'up' | 'down' | 'flat' }[];
}

const mockData: PopulationMetrics = {
  totalPatients: 8432,
  activeEncounters: 247,
  riskDistribution: [
    { level: 'Low Risk', count: 5059, percentage: 60, color: '#10b981' },
    { level: 'Moderate Risk', count: 2108, percentage: 25, color: '#f59e0b' },
    { level: 'High Risk', count: 844, percentage: 10, color: '#ef4444' },
    { level: 'Critical', count: 421, percentage: 5, color: '#7c3aed' },
  ],
  careGaps: [
    { condition: 'Diabetes HbA1c Screening', patientsAtRisk: 1240, screened: 892, gapPercentage: 28.1 },
    { condition: 'Colorectal Cancer Screening', patientsAtRisk: 2100, screened: 1470, gapPercentage: 30.0 },
    { condition: 'Depression Screening (PHQ-9)', patientsAtRisk: 8432, screened: 5897, gapPercentage: 30.1 },
    { condition: 'Hypertension Follow-up', patientsAtRisk: 1850, screened: 1591, gapPercentage: 14.0 },
    { condition: 'Mammography Screening', patientsAtRisk: 1680, screened: 1310, gapPercentage: 22.0 },
  ],
  chronicConditions: [
    { condition: 'Hypertension', prevalence: 1850, controlled: 1332, uncontrolled: 518 },
    { condition: 'Type 2 Diabetes', prevalence: 1240, controlled: 868, uncontrolled: 372 },
    { condition: 'Depression', prevalence: 980, controlled: 637, uncontrolled: 343 },
    { condition: 'Anxiety Disorders', prevalence: 760, controlled: 532, uncontrolled: 228 },
    { condition: 'COPD', prevalence: 420, controlled: 294, uncontrolled: 126 },
    { condition: 'Heart Failure', prevalence: 210, controlled: 147, uncontrolled: 63 },
  ],
  demographics: [
    { ageGroup: '0-17', count: 1264, percentage: 15 },
    { ageGroup: '18-34', count: 1686, percentage: 20 },
    { ageGroup: '35-49', count: 2109, percentage: 25 },
    { ageGroup: '50-64', count: 1855, percentage: 22 },
    { ageGroup: '65+', count: 1518, percentage: 18 },
  ],
  sdohFactors: [
    { factor: 'Food Insecurity', affectedPatients: 843, percentage: 10.0 },
    { factor: 'Housing Instability', affectedPatients: 506, percentage: 6.0 },
    { factor: 'Transportation Barriers', affectedPatients: 675, percentage: 8.0 },
    { factor: 'Social Isolation', affectedPatients: 590, percentage: 7.0 },
    { factor: 'Financial Strain', affectedPatients: 1265, percentage: 15.0 },
  ],
  qualityMeasures: [
    { measure: 'Preventive Visit Rate', target: 85, current: 78, trend: 'up' },
    { measure: 'Medication Adherence', target: 90, current: 82, trend: 'up' },
    { measure: 'ED Utilization Rate', target: 15, current: 18, trend: 'down' },
    { measure: '30-Day Readmission', target: 10, current: 12, trend: 'flat' },
    { measure: 'Patient Satisfaction', target: 90, current: 87, trend: 'up' },
  ],
};

export default function PopulationHealthPage() {
  const [data, setData] = useState<PopulationMetrics>(mockData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analytics/population-health');
        if (response.ok) {
          setData(await response.json());
        }
      } catch { /* Use mock data */ }
    };
    fetchData();
  }, []);

  return (
    <>
      <Head>
        <title>Population Health | ATTENDING AI</title>
      </Head>
      
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>Population Health Dashboard</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Organization-wide health metrics and risk stratification — {data.totalPatients.toLocaleString()} patients
        </p>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Total Patients</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{data.totalPatients.toLocaleString()}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Active Encounters</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{data.activeEncounters}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>High/Critical Risk</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>
              {(data.riskDistribution.find(r => r.level === 'High Risk')?.count || 0) + (data.riskDistribution.find(r => r.level === 'Critical')?.count || 0)}
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Avg Care Gap</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
              {(data.careGaps.reduce((acc, g) => acc + g.gapPercentage, 0) / data.careGaps.length).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Risk Distribution + Demographics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Risk Stratification</h2>
            <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              {data.riskDistribution.map((risk) => (
                <div key={risk.level} style={{ width: `${risk.percentage}%`, background: risk.color }} title={`${risk.level}: ${risk.count}`} />
              ))}
            </div>
            {data.riskDistribution.map((risk) => (
              <div key={risk.level} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: risk.color, display: 'inline-block' }} />
                  {risk.level}
                </span>
                <span style={{ fontWeight: 500 }}>{risk.count.toLocaleString()} ({risk.percentage}%)</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Age Demographics</h2>
            {data.demographics.map((d) => (
              <div key={d.ageGroup} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ width: '50px', fontSize: '13px', color: '#6b7280' }}>{d.ageGroup}</span>
                <div style={{ flex: 1, height: '20px', background: '#f3f4f6', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${d.percentage}%`, background: '#6366f1', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '80px', fontSize: '13px', textAlign: 'right' }}>{d.count.toLocaleString()} ({d.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Care Gaps */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Care Gaps</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Screening/Measure</th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Eligible</th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Completed</th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Gap</th>
                <th style={{ padding: '8px', width: '200px' }}></th>
              </tr>
            </thead>
            <tbody>
              {data.careGaps.map((gap) => (
                <tr key={gap.condition} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{gap.condition}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{gap.patientsAtRisk.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{gap.screened.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: gap.gapPercentage > 25 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                    {gap.gapPercentage.toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
                      <div style={{
                        height: '100%',
                        width: `${100 - gap.gapPercentage}%`,
                        background: gap.gapPercentage > 25 ? '#fca5a5' : '#fde68a',
                        borderRadius: '4px',
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chronic Conditions + SDoH */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Chronic Condition Management</h2>
            {data.chronicConditions.map((c) => (
              <div key={c.condition} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500 }}>{c.condition}</span>
                  <span style={{ color: '#6b7280' }}>{c.prevalence} patients</span>
                </div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(c.controlled / c.prevalence) * 100}%`, background: '#10b981' }} title={`Controlled: ${c.controlled}`} />
                  <div style={{ width: `${(c.uncontrolled / c.prevalence) * 100}%`, background: '#ef4444' }} title={`Uncontrolled: ${c.uncontrolled}`} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '2px', marginRight: '4px' }}></span>Controlled</span>
              <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ef4444', borderRadius: '2px', marginRight: '4px' }}></span>Uncontrolled</span>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Social Determinants of Health</h2>
            {data.sdohFactors.map((f) => (
              <div key={f.factor} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ width: '160px', fontSize: '14px' }}>{f.factor}</span>
                <div style={{ flex: 1, height: '16px', background: '#f3f4f6', borderRadius: '4px' }}>
                  <div style={{ height: '100%', width: `${f.percentage * 3}%`, background: '#8b5cf6', borderRadius: '4px' }} />
                </div>
                <span style={{ width: '90px', fontSize: '13px', textAlign: 'right' }}>{f.affectedPatients} ({f.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Measures */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Quality Measures</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {data.qualityMeasures.map((m) => {
              const onTarget = m.measure === 'ED Utilization Rate' || m.measure === '30-Day Readmission'
                ? m.current <= m.target
                : m.current >= m.target;
              return (
                <div key={m.measure} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{m.measure}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: onTarget ? '#10b981' : '#f59e0b' }}>
                    {m.current}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>Target: {m.target}%</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
