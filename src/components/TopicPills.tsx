'use client';

interface TopicPillsProps {
  topics: string[];
  onTopicClick: (topic: string) => void;
}

export default function TopicPills({ topics, onTopicClick }: TopicPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map(topic => (
        <button
          key={topic}
          onClick={() => onTopicClick(topic)}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300 transition-colors"
        >
          {topic}
        </button>
      ))}
    </div>
  );
}
