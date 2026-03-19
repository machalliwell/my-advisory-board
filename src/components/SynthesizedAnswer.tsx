'use client';

interface SynthesizedAnswerProps {
  text: string;
  isStreaming: boolean;
  error: string | null;
}

export default function SynthesizedAnswer({ text, isStreaming, error }: SynthesizedAnswerProps) {
  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-6">
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!text && !isStreaming) return null;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-purple-500/20 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs">
          &bull;
        </div>
        <span className="text-sm font-medium text-purple-300">
          Synthesized Answer
        </span>
        {isStreaming && (
          <span className="text-xs text-gray-500 animate-pulse">thinking...</span>
        )}
      </div>

      <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
        {text.split('\n').map((line, i) => {
          if (line.startsWith('### ')) {
            return (
              <div key={i} className="text-xs font-semibold text-purple-400 uppercase tracking-wider mt-4 mb-1">
                {line.slice(4)}
              </div>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <div key={i} className="text-base font-semibold text-white mt-4 mb-1">
                {line.slice(3)}
              </div>
            );
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return (
              <div key={i} className="font-semibold text-white mt-3 mb-1">
                {line.slice(2, -2)}
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return (
              <div key={i} className="pl-4 relative my-0.5">
                <span className="absolute left-0 text-purple-400">·</span>
                {renderInlineBold(line.slice(2))}
              </div>
            );
          }
          if (line.match(/^\d+\.\s/)) {
            const match = line.match(/^(\d+\.)\s(.*)$/);
            if (match) {
              return (
                <div key={i} className="pl-5 relative my-0.5">
                  <span className="absolute left-0 text-purple-400 font-semibold">{match[1]}</span>
                  {renderInlineBold(match[2])}
                </div>
              );
            }
          }
          if (line.trim() === '') {
            return <div key={i} className="h-2" />;
          }
          return <div key={i} className="my-0.5">{renderInlineBold(line)}</div>;
        })}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
