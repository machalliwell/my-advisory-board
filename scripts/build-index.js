const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { globSync } = require('glob');
const { execSync } = require('child_process');

// Clone data repos if not present (for Vercel builds)
function ensureData() {
  if (!fs.existsSync('data/chatprd')) {
    console.log('📥 Cloning ChatPRD transcripts...');
    execSync('git clone --depth 1 https://github.com/ChatPRD/lennys-podcast-transcripts.git data/chatprd', { stdio: 'inherit' });
  }
  if (!fs.existsSync('data/official')) {
    console.log('📥 Cloning official podcast data...');
    execSync('git clone --depth 1 https://github.com/LennysNewsletter/lennys-newsletterpodcastdata.git data/official', { stdio: 'inherit' });
  }
}

// Signal words for advice density scoring
const SIGNAL_WORDS = [
  'framework', 'principle', 'rule', 'lesson', 'mistake', 'advice', 'recommend',
  'strategy', 'tactic', 'approach', 'important', 'critical', 'key', 'secret',
  'never', 'always', 'best', 'worst', 'should', 'biggest', 'playbook', 'model',
  'how to', 'hire', 'fire', 'prioritize', 'roadmap', 'metric', 'retention',
  'growth', 'product market fit', 'stakeholder', 'leadership', 'decision',
  'scope', 'ship', 'launch', 'mvp'
];

function stripTimestamps(text) {
  return text.replace(/\(\d{2}:\d{2}:\d{2}\)/g, '');
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/---+/g, '')
    .trim();
}

function chunkText(text, targetWords = 400) {
  const lines = text.split('\n').filter(l => l.trim());
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (const line of lines) {
    const words = line.split(/\s+/).length;
    if (wordCount + words > targetWords && current.length > 0) {
      chunks.push(current.join('\n'));
      current = [line];
      wordCount = words;
    } else {
      current.push(line);
      wordCount += words;
    }
  }
  if (current.length > 0) {
    chunks.push(current.join('\n'));
  }
  return chunks;
}

function scoreChunk(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of SIGNAL_WORDS) {
    const regex = new RegExp(word, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      score += matches.length;
    }
  }
  // Bonus for shorter, punchier advice
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 300) score *= 1.2;
  return score;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseChatPRDEpisodes() {
  const episodes = [];
  const episodeDirs = globSync('data/chatprd/episodes/*/');

  for (const dir of episodeDirs) {
    const transcriptPath = path.join(dir, 'transcript.md');
    if (!fs.existsSync(transcriptPath)) continue;

    try {
      const raw = fs.readFileSync(transcriptPath, 'utf-8');
      const { data: frontmatter, content } = matter(raw);

      if (!frontmatter.guest || !content.trim()) continue;

      const slug = path.basename(dir.replace(/\/$/, ''));
      const cleanText = stripMarkdown(stripTimestamps(content));

      episodes.push({
        id: slug,
        guest: frontmatter.guest,
        title: frontmatter.title || `${frontmatter.guest} on Lenny's Podcast`,
        youtubeUrl: frontmatter.youtube_url || '',
        publishDate: frontmatter.publish_date || '',
        keywords: frontmatter.keywords || [],
        source: 'chatprd',
        text: cleanText,
      });
    } catch (e) {
      console.warn(`Skipping ${dir}: ${e.message}`);
    }
  }
  return episodes;
}

function parseOfficialEpisodes() {
  const episodes = [];
  const files = globSync('data/official/podcasts/*.md');

  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const { data: frontmatter, content } = matter(raw);

      if (!frontmatter.guest || !content.trim()) continue;

      const slug = path.basename(file, '.md');
      const cleanText = stripMarkdown(stripTimestamps(content));

      episodes.push({
        id: slug,
        guest: frontmatter.guest,
        title: frontmatter.title || `${frontmatter.guest} on Lenny's Podcast`,
        youtubeUrl: frontmatter.youtube_url || '',
        publishDate: frontmatter.date || '',
        keywords: [],
        source: 'official',
        text: cleanText,
        wordCount: frontmatter.word_count || 0,
        description: frontmatter.description || '',
      });
    } catch (e) {
      console.warn(`Skipping ${file}: ${e.message}`);
    }
  }
  return episodes;
}

function mergeEpisodes(chatprdEps, officialEps) {
  const merged = new Map();

  // Add all ChatPRD episodes first (preferred transcripts)
  for (const ep of chatprdEps) {
    const key = ep.guest.toLowerCase().trim();
    merged.set(key, ep);
  }

  // Merge official episodes - add new ones, enrich existing
  for (const ep of officialEps) {
    const key = ep.guest.toLowerCase().trim();
    if (merged.has(key)) {
      // Enrich existing with official metadata
      const existing = merged.get(key);
      if (!existing.youtubeUrl && ep.youtubeUrl) existing.youtubeUrl = ep.youtubeUrl;
      if (ep.description) existing.description = ep.description;
    } else {
      merged.set(key, ep);
    }
  }

  return Array.from(merged.values());
}

function parseTopicIndexes() {
  const topics = {};
  const files = globSync('data/chatprd/index/*.md');

  for (const file of files) {
    const basename = path.basename(file, '.md');
    if (basename === 'README') continue;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const slugs = [];
      const linkRegex = /\[([^\]]+)\]\(\.\.\/episodes\/([^/]+)\//g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        slugs.push(match[2]);
      }
      if (slugs.length > 0) {
        const topicName = basename.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        topics[topicName] = slugs;
      }
    } catch (e) {
      console.warn(`Skipping topic ${file}: ${e.message}`);
    }
  }
  return topics;
}

function main() {
  console.log('📦 Building PM Advisory Board search index...\n');
  ensureData();

  // 1. Parse episodes
  console.log('📝 Parsing ChatPRD transcripts...');
  const chatprdEps = parseChatPRDEpisodes();
  console.log(`   Found ${chatprdEps.length} episodes`);

  console.log('📝 Parsing official transcripts...');
  const officialEps = parseOfficialEpisodes();
  console.log(`   Found ${officialEps.length} episodes`);

  // 2. Merge
  console.log('🔀 Merging episodes...');
  const episodes = mergeEpisodes(chatprdEps, officialEps);
  console.log(`   ${episodes.length} unique episodes after merge`);

  // 3. Chunk and score
  console.log('✂️  Chunking transcripts...');
  let allChunks = [];

  for (const ep of episodes) {
    const chunks = chunkText(ep.text);
    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      const score = scoreChunk(text);
      allChunks.push({
        episodeId: ep.id,
        guest: ep.guest,
        title: ep.title,
        youtubeUrl: ep.youtubeUrl,
        keywords: ep.keywords,
        text: text,
        score: score,
        chunkIndex: i,
      });
    }
  }
  console.log(`   ${allChunks.length} total chunks`);

  // 4. Sort by score, keep top 500
  allChunks.sort((a, b) => b.score - a.score);
  const topChunks = allChunks.slice(0, 500);
  console.log(`   Kept top 500 chunks (min score: ${topChunks[topChunks.length - 1]?.score.toFixed(1)})`);

  // Remove score from output, not needed at runtime
  const wisdomChunks = topChunks.map(({ score, chunkIndex, ...rest }) => rest);

  // 5. Parse topic indexes
  console.log('📚 Parsing topic indexes...');
  const topics = parseTopicIndexes();
  console.log(`   ${Object.keys(topics).length} topics`);

  // 6. Build episode summary array (without full text)
  const episodeSummaries = episodes.map(({ text, source, ...rest }) => rest);

  // 7. Output
  const index = {
    buildDate: new Date().toISOString(),
    episodeCount: episodes.length,
    chunkCount: wisdomChunks.length,
    topicCount: Object.keys(topics).length,
    episodes: episodeSummaries,
    topics,
    chunks: wisdomChunks,
  };

  const outPath = path.join('public', 'search-index.json');
  fs.writeFileSync(outPath, JSON.stringify(index));
  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`\n✅ Written ${outPath} (${sizeMB} MB)`);
  console.log(`   ${index.episodeCount} episodes, ${index.chunkCount} chunks, ${index.topicCount} topics`);
}

main();
