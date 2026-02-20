import React from 'react';
import { Brain, AlertTriangle, TrendingUp, Lightbulb, Target, Activity, ShieldCheck } from 'lucide-react';
import { TERM, CLINICAL_DISCLAIMER_SHORT } from '@attending/shared/lib/clinicalBranding';

interface InsightItem {
  id: string;
  title: string;
  content: string;
  type: 'critical' | 'diagnosis' | 'population' | 'decision' | 'quality';
  icon: React.ElementType;
}

const AIInsights = () => {
  const insights: InsightItem[] = [
    {
      id: '1',
      title: 'Critical Alert',
      content: "John Doe's symptom constellation is consistent with acute coronary syndrome based on published cardiac risk criteria. Consider immediate 12-lead EKG and troponin levels.",
      type: 'critical',
      icon: AlertTriangle
    },
    {
      id: '2',
      title: 'Diagnostic Considerations',
      content: 'Sarah Wilson: Evidence-based differential includes migraine (78%), tension headache (15%), secondary headache (7%). Consider neuroimaging if atypical features develop.',
      type: 'diagnosis',
      icon: Brain
    },
    {
      id: '3',
      title: 'Population Health',
      content: '30% increase in respiratory symptoms this week. Local influenza activity elevated. Consider prophylaxis for high-risk patients.',
      type: 'population',
      icon: TrendingUp
    },
    {
      id: '4',
      title: 'Clinical Decision Support',
      content: 'Based on recent literature, consider point-of-care ultrasound for acute dyspnea patients to improve diagnostic accuracy by 23%.',
      type: 'decision',
      icon: Lightbulb
    },
    {
      id: '5',
      title: 'Quality Metrics',
      content: 'Your antibiotic prescribing aligns with guidelines 94% of the time. Consider stewardship protocols for URI patients.',
      type: 'quality',
      icon: Target
    }
  ];

  const getInsightStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'diagnosis':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'population':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'decision':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'quality':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">{TERM.aiInsightsHeader}</h2>
        </div>
      </div>

      <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border ${getInsightStyles(insight.type)} transition-all hover:shadow-sm cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Icon className="w-5 h-5 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
                  <p className="text-sm leading-relaxed opacity-90">{insight.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
            <span className="italic">{CLINICAL_DISCLAIMER_SHORT}</span>
          </div>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View All Insights
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
