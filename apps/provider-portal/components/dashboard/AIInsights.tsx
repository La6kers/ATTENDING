import React from 'react';
import { Brain, AlertTriangle, TrendingUp, Lightbulb, Target, Activity } from 'lucide-react';

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
      content: "John Doe's presentation has 85% probability of acute coronary syndrome based on symptom constellation. Immediate 12-lead EKG and troponin levels recommended.",
      type: 'critical',
      icon: AlertTriangle
    },
    {
      id: '2',
      title: 'Differential Diagnosis',
      content: 'Sarah Wilson: Migraine (78%), Tension headache (15%), Secondary headache (7%). Consider neuroimaging if atypical features develop.',
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
          <Brain className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">BioMistral Clinical Insights</h2>
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
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Activity className="w-4 h-4 text-green-500" />
            <span>AI Model: BioMistral-7B</span>
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
