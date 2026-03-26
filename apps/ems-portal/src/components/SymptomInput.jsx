import { useState } from 'react';

export default function SymptomInput({ onSubmit, loading }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) onSubmit(text.trim());
  };

  const suggestions = [
    'Chest pain',
    'Headache',
    'Cough',
    'Back pain',
    'Shortness of breath',
    'Dizziness',
    'Abdominal pain',
    'Fever',
  ];

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your main concern or symptoms in your own words..."
          className="input min-h-[120px] resize-none"
          disabled={loading}
        />
        <button type="submit" disabled={!text.trim() || loading} className="btn-compass w-full disabled:opacity-50">
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </form>

      {!text && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Common reasons for visit:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="px-3 py-1.5 bg-compass-50 text-compass-700 rounded-full text-sm hover:bg-compass-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
