import type { FC} from 'react';
import { useState } from 'react';
import { useInbox } from '@/store/useInbox';
import { Send, Sparkles, Paperclip, Clock } from 'lucide-react';
import { Button } from '../ui/button';

export const ResponseComposer: FC = () => {
  const { currentMessage, aiAssistant, generateAIResponse } = useInbox();
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!currentMessage) return null;

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const aiResponse = await generateAIResponse(currentMessage.id);
      setResponse(aiResponse);
    } catch (error) {
      console.error('Failed to generate AI response:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = () => {
    // Handle sending the response
    console.log('Sending response:', response);
    setResponse('');
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Compose Response</h3>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate AI Response'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Type your response here..."
          className="w-full rounded-lg border border-slate-300 p-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          rows={6}
        />

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              <Paperclip className="h-4 w-4" />
              Attach
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
              <Clock className="h-4 w-4" />
              Schedule
            </button>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Save Draft
            </Button>
            <Button
              onClick={handleSend}
              disabled={!response.trim()}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Response
            </Button>
          </div>
        </div>

        {aiAssistant.suggestion && (
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="mb-2 text-sm font-medium text-blue-800">AI Suggestion:</div>
            <p className="text-sm text-blue-700">{aiAssistant.suggestion}</p>
            <button
              onClick={() => setResponse(aiAssistant.suggestion || '')}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Use this suggestion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
