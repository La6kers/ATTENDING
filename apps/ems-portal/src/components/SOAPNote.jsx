export default function SOAPNote({ note }) {
  if (!note) return null;

  // Parse SOAP sections from the note text
  const sections = parseSOAP(note);

  return (
    <div className="space-y-4">
      {sections.map(({ label, letter, content, color }) => (
        <div key={letter} className="border rounded-lg overflow-hidden">
          <div className={`px-4 py-2 ${color} flex items-center gap-2`}>
            <span className="font-bold text-lg">{letter}</span>
            <span className="font-medium text-sm">{label}</span>
          </div>
          <div className="p-4 text-sm whitespace-pre-wrap leading-relaxed">
            {content || <span className="text-gray-400 italic">Not yet documented</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function parseSOAP(text) {
  const sectionDefs = [
    { letter: 'S', label: 'Subjective', color: 'bg-blue-50 text-blue-900' },
    { letter: 'O', label: 'Objective', color: 'bg-green-50 text-green-900' },
    { letter: 'A', label: 'Assessment', color: 'bg-yellow-50 text-yellow-900' },
    { letter: 'P', label: 'Plan', color: 'bg-purple-50 text-purple-900' },
  ];

  // Try to split by S:/O:/A:/P: markers
  const regex = /\n?([SOAP])[:\.]\s*/g;
  const parts = text.split(regex);

  if (parts.length >= 8) {
    // Successful split: parts = [preamble, 'S', content, 'O', content, 'A', content, 'P', content]
    return sectionDefs.map(def => {
      const idx = parts.indexOf(def.letter);
      return { ...def, content: idx >= 0 ? parts[idx + 1]?.trim() : '' };
    });
  }

  // Fallback: show entire note in S section
  return sectionDefs.map((def, i) => ({
    ...def,
    content: i === 0 ? text : ''
  }));
}
