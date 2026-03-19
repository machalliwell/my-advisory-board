'use client';

interface LinkedInPreviewProps {
  post: string;
  copied: boolean;
  onCopy: () => void;
}

export default function LinkedInPreview({ post, copied, onCopy }: LinkedInPreviewProps) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-orange-500/20 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-orange-400 uppercase tracking-wider">
          LinkedIn Post Preview
        </span>
        <button
          onClick={onCopy}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            copied
              ? 'bg-green-500/20 text-green-400'
              : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
        </button>
      </div>
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
        {post}
      </pre>
    </div>
  );
}
