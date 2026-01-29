import type { FC } from 'react';
import { useState, useRef } from 'react';
import { useInbox } from '@/store/useInbox';
import { Send, Sparkles, Paperclip, Clock, Check, RefreshCw, Edit3, X } from 'lucide-react';
import { Button } from '../ui/button';

export const ResponseComposer: FC = () => {
  const { currentMessage, aiAssistant, generateAIResponse } = useInbox();
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!currentMessage) return null;

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const aiResponse = await generateAIResponse(currentMessage.id);
      setAiDraft(aiResponse);
      setShowAIDraft(true);
    } catch (error) {
      console.error('Failed to generate AI response:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseDraft = () => {
    setResponse(aiDraft);
    setShowAIDraft(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    // Handle sending the response
    console.log('Sending response:', response);
    setResponse('');
    setAiDraft('');
    setShowAIDraft(false);
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Compose Response</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate AI Draft
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Draft Suggestion */}
      {showAIDraft && aiDraft && (
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="ai-suggestion-card">
            <div className="flex items-center justify-between mb-4">
              <div className="ai-suggestion-badge">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Generated Draft
              </div>
              <button
                onClick={() => setShowAIDraft(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="ai-draft-preview mb-4">
              <div className="whitespace-pre-wrap">{aiDraft}</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleUseDraft}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 
                         bg-gradient-to-r from-purple-600 to-indigo-600 text-white 
                         rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <Check className="w-4 h-4" />
                Use This Draft & Edit
              </button>
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="flex items-center gap-2 py-2.5 px-4 border-2 border-purple-200 
                         text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composer Area */}
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your Response
            {response && (
              <span className="ml-2 text-xs text-purple-600">(editing)</span>
            )}
          </label>
          <textarea
            ref={textareaRef}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response or click 'Generate AI Draft' above for a suggested response..."
            className="message-composer-textarea w-full resize-none"
            rows={8}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
              <Paperclip className="h-4 w-4" />
              Attach
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
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
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg"
            >
              <Send className="h-4 w-4" />
              Send Response
            </Button>
          </div>
        </div>

        {/* Legacy AI Suggestion (if available from store) */}
        {aiAssistant.suggestion && !showAIDraft && !response && (
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Quick AI Suggestion:</span>
            </div>
            <p className="text-sm text-purple-700 mb-3">{aiAssistant.suggestion}</p>
            <button
              onClick={() => setResponse(aiAssistant.suggestion || '')}
              className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              <Edit3 className="w-4 h-4" />
              Use & Edit This Suggestion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseComposer;
