import { useState } from 'react';

export default function AIInsight({ title, content, loading, onRequest, buttonLabel }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-attending-50 border border-attending-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-attending-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SparkleIcon />
          <span className="font-medium text-attending-900 text-sm">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-attending-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-attending-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-attending-600">AI is thinking...</span>
            </div>
          ) : content ? (
            <div className="prose prose-sm max-w-none text-gray-700 ai-content">
              <FormattedContent text={content} />
            </div>
          ) : onRequest ? (
            <button onClick={onRequest} className="btn-primary text-sm mt-1">
              {buttonLabel || 'Generate'}
            </button>
          ) : (
            <p className="text-sm text-gray-400 italic">No AI insights yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function FormattedContent({ text }) {
  if (!text) return null;

  // Simple markdown-like rendering
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3">{line.slice(3)}</h3>;
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2">{line.slice(4)}</h4>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold mt-2">{line.slice(2, -2)}</p>;
        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{formatInline(line.slice(2))}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="ml-4 list-decimal">{formatInline(line.replace(/^\d+\.\s*/, ''))}</li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text) {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function SparkleIcon() {
  return (
    <svg className="w-4 h-4 text-attending-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}
