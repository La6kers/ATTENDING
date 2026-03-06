import { useState, useEffect } from 'react';
import Head from 'next/head';

/**
 * AI Calibration Dashboard
 * 
 * Displays clinical AI model performance metrics:
 * - Recommendation accuracy vs provider decisions
 * - Confidence calibration curves
 * - Red flag detection sensitivity/specificity
 * - Drug interaction alert precision
 * - Model drift detection over time
 */

interface CalibrationMetrics {
  overallAccuracy: number;
  redFlagSensitivity: number;
  redFlagSpecificity: number;
  drugInteractionPrecision: number;
  averageConfidence: number;
  totalPredictions: number;
  providerOverrideRate: number;
  calibrationBuckets: CalibrationBucket[];
  weeklyTrend: WeeklyMetric[];
  topDisagreements: Disagreement[];
}

interface CalibrationBucket {
  confidenceRange: string;
  predictedProbability: number;
  actualOutcome: number;
  count: number;
}

interface WeeklyMetric {
  week: string;
  accuracy: number;
  predictions: number;
}

interface Disagreement {
  category: string;
  aiRecommendation: string;
  providerDecision: string;
  count: number;
  percentage: number;
}

// Mock data for development — replaced by API data in production
const mockMetrics: CalibrationMetrics = {
  overallAccuracy: 0.847,
  redFlagSensitivity: 0.962,
  redFlagSpecificity: 0.891,
  drugInteractionPrecision: 0.934,
  averageConfidence: 0.78,
  totalPredictions: 12847,
  providerOverrideRate: 0.153,
  calibrationBuckets: [
    { confidenceRange: '0-20%', predictedProbability: 0.1, actualOutcome: 0.08, count: 342 },
    { confidenceRange: '20-40%', predictedProbability: 0.3, actualOutcome: 0.27, count: 891 },
    { confidenceRange: '40-60%', predictedProbability: 0.5, actualOutcome: 0.48, count: 2103 },
    { confidenceRange: '60-80%', predictedProbability: 0.7, actualOutcome: 0.72, count: 4521 },
    { confidenceRange: '80-100%', predictedProbability: 0.9, actualOutcome: 0.91, count: 4990 },
  ],
  weeklyTrend: [
    { week: 'W1', accuracy: 0.82, predictions: 1840 },
    { week: 'W2', accuracy: 0.84, predictions: 1920 },
    { week: 'W3', accuracy: 0.83, predictions: 1780 },
    { week: 'W4', accuracy: 0.85, predictions: 1950 },
    { week: 'W5', accuracy: 0.85, predictions: 2010 },
    { week: 'W6', accuracy: 0.86, predictions: 1890 },
    { week: 'W7', accuracy: 0.84, predictions: 1957 },
    { week: 'W8', accuracy: 0.85, predictions: 1500 },
  ],
  topDisagreements: [
    { category: 'Chest Pain Triage', aiRecommendation: 'STAT ECG', providerDecision: 'Routine workup', count: 23, percentage: 4.2 },
    { category: 'Antibiotic Selection', aiRecommendation: 'Broad spectrum', providerDecision: 'Narrow spectrum', count: 18, percentage: 3.1 },
    { category: 'Imaging Priority', aiRecommendation: 'URGENT CT', providerDecision: 'Routine X-ray', count: 12, percentage: 2.1 },
    { category: 'Lab Panel Selection', aiRecommendation: 'Comprehensive', providerDecision: 'Basic panel', count: 9, percentage: 1.6 },
  ],
};

export default function AiCalibrationPage() {
  const [metrics, setMetrics] = useState<CalibrationMetrics>(mockMetrics);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In production, fetch from API
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/ai-calibration?range=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch {
        // Fall back to mock data in development
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [timeRange]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return '#10b981';
    if (value >= thresholds.warning) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <Head>
        <title>AI Calibration | ATTENDING AI</title>
      </Head>
      
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>AI Calibration Dashboard</h1>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>
              Clinical AI performance monitoring and calibration metrics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: timeRange === range ? '#3b82f6' : 'white',
                  color: timeRange === range ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontWeight: timeRange === range ? 600 : 400,
                }}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Overall Accuracy', value: metrics.overallAccuracy, format: 'percent', thresholds: { good: 0.85, warning: 0.75 } },
            { label: 'Red Flag Sensitivity', value: metrics.redFlagSensitivity, format: 'percent', thresholds: { good: 0.95, warning: 0.90 } },
            { label: 'Red Flag Specificity', value: metrics.redFlagSpecificity, format: 'percent', thresholds: { good: 0.85, warning: 0.75 } },
            { label: 'Drug Interaction Precision', value: metrics.drugInteractionPrecision, format: 'percent', thresholds: { good: 0.90, warning: 0.80 } },
            { label: 'Provider Override Rate', value: metrics.providerOverrideRate, format: 'percent', thresholds: { good: 0.20, warning: 0.30 } },
            { label: 'Total Predictions', value: metrics.totalPredictions, format: 'number', thresholds: { good: 0, warning: 0 } },
          ].map((metric) => (
            <div key={metric.label} style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{metric.label}</div>
              <div style={{
                fontSize: '28px',
                fontWeight: 700,
                color: metric.format === 'number' ? '#111827' : getStatusColor(metric.value, metric.thresholds),
              }}>
                {metric.format === 'percent' 
                  ? `${(metric.value * 100).toFixed(1)}%`
                  : metric.value.toLocaleString()
                }
              </div>
            </div>
          ))}
        </div>

        {/* Calibration Curve */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #e5e7eb',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Calibration Curve</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
              Predicted probability vs actual outcomes. Points on the diagonal indicate perfect calibration.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metrics.calibrationBuckets.map((bucket) => {
                const deviation = Math.abs(bucket.predictedProbability - bucket.actualOutcome);
                return (
                  <div key={bucket.confidenceRange} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '80px', fontSize: '13px', color: '#6b7280' }}>{bucket.confidenceRange}</span>
                    <div style={{ flex: 1, height: '24px', background: '#f3f4f6', borderRadius: '4px', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: `${bucket.predictedProbability * 100}%`,
                        top: '2px',
                        width: '8px',
                        height: '20px',
                        background: '#3b82f6',
                        borderRadius: '2px',
                        transform: 'translateX(-50%)',
                      }} title={`Predicted: ${(bucket.predictedProbability * 100).toFixed(0)}%`} />
                      <div style={{
                        position: 'absolute',
                        left: `${bucket.actualOutcome * 100}%`,
                        top: '2px',
                        width: '8px',
                        height: '20px',
                        background: '#10b981',
                        borderRadius: '2px',
                        transform: 'translateX(-50%)',
                        opacity: 0.8,
                      }} title={`Actual: ${(bucket.actualOutcome * 100).toFixed(0)}%`} />
                    </div>
                    <span style={{
                      width: '60px',
                      fontSize: '12px',
                      color: deviation > 0.05 ? '#ef4444' : '#10b981',
                      textAlign: 'right',
                    }}>
                      {deviation > 0 ? '+' : ''}{((bucket.actualOutcome - bucket.predictedProbability) * 100).toFixed(1)}%
                    </span>
                    <span style={{ width: '50px', fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>
                      n={bucket.count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
              <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '2px', marginRight: '4px' }}></span>Predicted</span>
              <span><span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '2px', marginRight: '4px' }}></span>Actual</span>
            </div>
          </div>

          {/* Weekly Accuracy Trend */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #e5e7eb',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Accuracy Trend</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
              Weekly accuracy tracking for model drift detection.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {metrics.weeklyTrend.map((week) => (
                <div key={week.week} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '30px', fontSize: '13px', color: '#6b7280' }}>{week.week}</span>
                  <div style={{ flex: 1, height: '20px', background: '#f3f4f6', borderRadius: '4px' }}>
                    <div style={{
                      height: '100%',
                      width: `${week.accuracy * 100}%`,
                      background: getStatusColor(week.accuracy, { good: 0.85, warning: 0.75 }),
                      borderRadius: '4px',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ width: '50px', fontSize: '13px', fontWeight: 500, textAlign: 'right' }}>
                    {(week.accuracy * 100).toFixed(1)}%
                  </span>
                  <span style={{ width: '50px', fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>
                    n={week.predictions}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Disagreements */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e5e7eb',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Top AI–Provider Disagreements</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
            Categories where AI recommendations most frequently differ from provider decisions. 
            Used to identify calibration opportunities and guideline alignment.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#6b7280' }}>AI Recommendation</th>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Provider Decision</th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '13px', color: '#6b7280' }}>Count</th>
                <th style={{ textAlign: 'right', padding: '8px', fontSize: '13px', color: '#6b7280' }}>% of Cases</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topDisagreements.map((d) => (
                <tr key={d.category} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{d.category}</td>
                  <td style={{ padding: '10px 8px', color: '#3b82f6' }}>{d.aiRecommendation}</td>
                  <td style={{ padding: '10px 8px', color: '#10b981' }}>{d.providerDecision}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{d.count}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{d.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
