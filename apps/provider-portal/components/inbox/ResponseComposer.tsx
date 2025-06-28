import { FC, useState } from 'react';
import { useInbox } from '@/store/useInbox';
import { toast } from '@/components/ui/use-toast';

export const ResponseComposer: FC = () => {
  const [response, setResponse] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const { currentMessage } = useInbox();

  const suggestions = [
    'Thank you for your message',
    'I understand your concern',
    "Let's address this together",
    'Based on your symptoms',
    'Your lab results show',
    'I recommend scheduling a follow-up',
  ];

  const generateResponse = () => {
    // Simulate AI response generation
    setResponse(
      'Thank you for reaching out. Based on your symptoms and medical history, I recommend scheduling an appointment so we can discuss this in detail and determine the best course of action for your care.'
    );
    toast({
      title: 'AI Response Generated',
      description: 'The response has been generated based on the context.',
    });
  };

  const improveResponse = () => {
    if (!response) {
      toast({
        title: 'No Response',
        description: 'Please write a response first.',
        variant: 'destructive',
      });
      return;
    }
    setResponse(
      response +
        ' Please don't hesitate to contact me if you have any additional questions or concerns.'
    );
    toast({
      title: 'Response Improved',
      description: 'The response tone has been improved.',
    });
  };

  const addContext = () => {
    setResponse(
      response +
        '\n\nBased on your medical history and current medications, this recommendation aligns with your treatment plan.'
    );
    toast({
      title: 'Context Added',
      description: 'Medical context has been added to the response.',
    });
  };

  const sendResponse = () => {
    if (!response.trim()) {
      toast({
        title: 'Empty Response',
        description: 'Please write a response before sending.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Response Sent',
      description: 'Your response has been sent successfully.',
    });
    setResponse('');
  };

  return (
    <div className="border-t border-slate-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Compose Response</h3>
        <button
          onClick={() => setShowAISuggestions(!showAISuggestions)}
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          ? AI Assist
        </button>
      </div>

      {showAISuggestions && (
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setResponse((prev) => (prev ? prev + ' ' + suggestion : suggestion))}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs hover:bg-blue-500 hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Type your response here..."
        className="mb-4 min-h-[120px] w-full resize-y rounded-xl border border-slate-200 p-4 text-sm"
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={generateResponse}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            ?? Generate Response
          </button>
          <button
            onClick={improveResponse}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            ?? Improve Tone
          </button>
          <button
            onClick={addContext}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            ?? Add Context
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast({
                title: 'Draft Saved',
                description: 'Your response has been saved as a draft.',
              });
            }}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            ?? Save Draft
          </button>
          <button
            onClick={sendResponse}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            ?? Send Response
          </button>
        </div>
      </div>
    </div>
  );
};