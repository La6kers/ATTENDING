import { FC } from 'react';
import { useInbox } from '@/store/useInbox';
import { toast } from '@/components/ui/use-toast';

export const AIAssistant: FC = () => {
  const { currentMessage } = useInbox();
  if (!currentMessage) return null;

  const getAISuggestions = () => {
    if (currentMessage.urgent && currentMessage.preview.includes('chest pain')) {
      return [
        {
          title: '?? Emergency Protocol',
          description: 'Recommend immediate ER visit',
          action: 'emergency',
        },
        {
          title: '?? Clinical Assessment',
          description: 'Review cardiac risk factors',
          action: 'assessment',
        },
      ];
    } else if (currentMessage.type === 'refill') {
      return [
        {
          title: '?? Smart Refill Analysis',
          description: 'AI-powered medication review',
          action: 'analyze_refill',
        },
        {
          title: '?? Safety Check',
          description: 'Drug interactions & allergies',
          action: 'safety_check',
        },
      ];
    } else if (currentMessage.type === 'lab') {
      return [
        {
          title: '?? Result Analysis',
          description: 'AI-powered interpretation',
          action: 'analyze',
        },
        {
          title: '?? Trend Comparison',
          description: 'Compare with previous results',
          action: 'trend',
        },
      ];
    }
    return [
      {
        title: '?? Smart Response',
        description: 'Generate appropriate reply',
        action: 'response',
      },
      {
        title: '?? Clinical Context',
        description: 'Add relevant medical info',
        action: 'context',
      },
    ];
  };

  const handleAction = (action: string) => {
    toast({
      title: 'AI Action',
      description: `Executing ${action} action...`,
    });
  };

  return (
    <div className="mb-6 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          ??
        </div>
        <div className="text-lg font-semibold">AI Assistant Recommendations</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {getAISuggestions().map((suggestion) => (
          <button
            key={suggestion.action}
            onClick={() => handleAction(suggestion.action)}
            className="rounded-lg bg-white/15 p-4 text-left transition-all hover:bg-white/25 hover:translate-y-[-2px]"
          >
            <div className="mb-1 font-semibold">{suggestion.title}</div>
            <div className="text-sm opacity-90">{suggestion.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};