#!/usr/bin/env python3
"""
PM Wisdom Engine — Data Pipeline
Clones both transcript repos, parses, chunks, scores, and builds search index.

Usage:
    python build-index.py

Output:
    - wisdom_data.json (compact: episodes + topics + top wisdom chunks)
    - full_index.json  (complete: all 7000+ chunks for vector DB ingestion)
"""

import os
import json
import re
import sys

try:
    import yaml
except ImportError:
    print("Installing pyyaml...")
    os.system(f"{sys.executable} -m pip install pyyaml -q")
    import yaml

# --- Config ---
CHATPRD_REPO = "https://github.com/ChatPRD/lennys-podcast-transcripts.git"
OFFICIAL_REPO = "https://github.com/LennysNewsletter/lennys-newsletterpodcastdata.git"
CHATPRD_DIR = "chatprd-transcripts"
OFFICIAL_DIR = "lenny-official"
CHUNK_SIZE = 800  # words per chunk
CHUNK_OVERLAP = 100
TOP_WISDOM_CHUNKS = 200

# --- Helpers ---

def parse_frontmatter(content):
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                meta = yaml.safe_load(parts[1])
                return meta or {}, parts[2].strip()
            except:
                pass
    return {}, content

def chunk_transcript(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip() and len(p.strip()) > 40]
    chunks, current, current_len = [], [], 0
    for para in paragraphs:
        words = len(para.split())
        if current_len + words > chunk_size and current:
            chunks.append('\n\n'.join(current))
            current = [current[-1]] if overlap > 0 and current else []
            current_len = len(current[-1].split()) if current else 0
        current.append(para)
        current_len += words
    if current:
        chunks.append('\n\n'.join(current))
    return chunks

STOP_WORDS = {'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'is','it','this','that','was','are','be','have','has','had','do','does','did',
    'will','would','could','should','may','might','can','not','so','if','then',
    'than','too','very','just','about','up','out','all','also','been','both',
    'each','few','more','most','other','some','such','into','over','after',
    'before','between','under','again','once','here','there','when','where',
    'why','how','what','which','who','its','his','her','their','our','my',
    'your','one','two','like','think','know','really','going','want','get',
    'got','say','said','make','much','many','way','thing','things','time',
    'people','right','because','actually','yeah','okay','well','something',
    'kind','lot','dont','ive','youre','thats','im','them','they','you','we',
    'me','him','us','from','by','as','i','need','take','come','go','see',
    'look','give','even','still','new','first','last','good','same','back',
    'every','any','around','tell','work','try','keep','let','help','show'}

def extract_keywords(text, top_n=10):
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    freq = {}
    for w in words:
        if w not in STOP_WORDS:
            freq[w] = freq.get(w, 0) + 1
    return [w for w, _ in sorted(freq.items(), key=lambda x: -x[1])[:top_n]]

ADVICE_SIGNALS = [
    'framework', 'principle', 'rule', 'lesson', 'mistake', 'advice', 'recommend',
    'strategy', 'tactic', 'approach', 'important', 'critical', 'key', 'secret',
    'never', 'always', 'best', 'worst', 'should', 'biggest', 'number one',
    'first thing', 'most important', 'what i learned', 'here\'s what', 'tip',
    'playbook', 'model', 'how to', 'step', 'process', 'system', 'method',
    'hire', 'fire', 'prioriti', 'roadmap', 'metric', 'okr', 'kpi',
    'retention', 'growth', 'product market fit', 'stakeholder', 'leadership',
    'decision', 'trade-off', 'tradeoff', 'scope', 'ship', 'launch', 'mvp'
]

def score_advice_density(text):
    text_lower = text.lower()
    score = sum(1 for s in ADVICE_SIGNALS if s in text_lower)
    wc = len(text.split())
    if wc > 100: score += 2
    if wc > 200: score += 2
    return score

# --- Main Pipeline ---

def main():
    # Clone repos if not present
    if not os.path.exists(CHATPRD_DIR):
        print(f"Cloning ChatPRD repo...")
        os.system(f"git clone {CHATPRD_REPO} {CHATPRD_DIR}")
    if not os.path.exists(OFFICIAL_DIR):
        print(f"Cloning official Lenny repo...")
        os.system(f"git clone {OFFICIAL_REPO} {OFFICIAL_DIR}")

    episodes = []
    all_chunks = []
    seen_guests = set()

    # 1. Process ChatPRD episodes
    print("Processing ChatPRD episodes...")
    chatprd_ep_dir = os.path.join(CHATPRD_DIR, 'episodes')
    for ep_name in sorted(os.listdir(chatprd_ep_dir)):
        path = os.path.join(chatprd_ep_dir, ep_name, 'transcript.md')
        if not os.path.exists(path): continue
        with open(path, 'r') as f: content = f.read()
        meta, body = parse_frontmatter(content)
        guest = meta.get('guest', ep_name.replace('-', ' ').title())
        episode = {
            'id': ep_name, 'guest': guest,
            'title': meta.get('title', guest),
            'date': str(meta.get('publish_date', '')),
            'description': str(meta.get('description', ''))[:300],
            'youtube_url': meta.get('youtube_url', ''),
            'keywords': meta.get('keywords', extract_keywords(body)),
            'source': 'chatprd',
            'chunk_start': len(all_chunks), 'chunk_count': 0
        }
        chunks = chunk_transcript(body)
        episode['chunk_count'] = len(chunks)
        episodes.append(episode)
        seen_guests.add(guest.lower().strip())
        for i, chunk in enumerate(chunks):
            text = re.sub(r'^#.*?\n', '', chunk)
            text = re.sub(r'\(\d{2}:\d{2}:\d{2}\)', '', text).replace('**', '').strip()
            all_chunks.append({
                'episode_id': ep_name, 'guest': guest, 'title': episode['title'],
                'chunk_index': i, 'text': text[:2000],
                'keywords': extract_keywords(text, 5)
            })

    # 2. Process official Lenny episodes
    print("Processing official Lenny episodes...")
    official_dir = os.path.join(OFFICIAL_DIR, 'podcasts')
    index_path = os.path.join(OFFICIAL_DIR, 'index.json')
    official_meta = {}
    if os.path.exists(index_path):
        with open(index_path) as f:
            for ep in json.load(f).get('podcasts', []):
                key = ep['filename'].replace('podcasts/', '').replace('.md', '')
                official_meta[key] = ep

    if os.path.exists(official_dir):
        for fname in sorted(os.listdir(official_dir)):
            if not fname.endswith('.md'): continue
            ep_key = fname.replace('.md', '')
            with open(os.path.join(official_dir, fname)) as f: content = f.read()
            meta, body = parse_frontmatter(content)
            idx = official_meta.get(ep_key, {})
            guest = meta.get('guest', idx.get('guest', ep_key.replace('-', ' ').title()))
            if guest.lower().strip() in seen_guests:
                for ep in episodes:
                    if ep['guest'].lower().strip() == guest.lower().strip():
                        ep['source'] = 'both'
                        if idx: ep['date'] = str(idx.get('date', ep['date']))
                        break
                continue
            episode = {
                'id': ep_key, 'guest': guest,
                'title': meta.get('title', idx.get('title', guest)),
                'date': str(meta.get('date', idx.get('date', ''))),
                'description': str(meta.get('description', idx.get('description', '')))[:300],
                'youtube_url': meta.get('youtube_url', ''),
                'keywords': extract_keywords(body),
                'source': 'official',
                'chunk_start': len(all_chunks), 'chunk_count': 0
            }
            chunks = chunk_transcript(body)
            episode['chunk_count'] = len(chunks)
            episodes.append(episode)
            for i, chunk in enumerate(chunks):
                text = re.sub(r'^#.*?\n', '', chunk)
                text = re.sub(r'\(\d{2}:\d{2}:\d{2}\)', '', text).replace('**', '').strip()
                all_chunks.append({
                    'episode_id': ep_key, 'guest': guest, 'title': episode['title'],
                    'chunk_index': i, 'text': text[:2000],
                    'keywords': extract_keywords(text, 5)
                })

    # 3. Load topic indexes from ChatPRD
    print("Loading topic indexes...")
    topic_map = {}
    index_dir = os.path.join(CHATPRD_DIR, 'index')
    if os.path.exists(index_dir):
        for fname in os.listdir(index_dir):
            if fname.endswith('.md') and fname not in ('README.md', 'episodes.md'):
                topic = fname.replace('.md', '').replace('-', ' ')
                with open(os.path.join(index_dir, fname)) as f:
                    content = f.read()
                ep_names = re.findall(r'\(\.\.\/episodes\/([^/]+)\/transcript\.md\)', content)
                topic_map[topic] = ep_names

    # 4. Score and select top wisdom chunks
    print("Scoring chunks for advice density...")
    scored = [(score_advice_density(c['text']), c) for c in all_chunks]
    scored.sort(key=lambda x: -x[0])
    top_chunks = [c for _, c in scored[:TOP_WISDOM_CHUNKS]]
    for c in top_chunks:
        c['text'] = c['text'][:500]

    # 5. Save outputs
    print("Saving outputs...")

    # Compact output (for the app)
    wisdom = {
        'episodes': [{'id': e['id'], 'guest': e['guest'], 'title': e['title'],
                       'date': e['date'], 'youtube_url': e['youtube_url'],
                       'keywords': e['keywords'][:5]} for e in episodes],
        'topics': topic_map,
        'wisdom_chunks': [{'episode_id': c['episode_id'], 'guest': c['guest'],
                           'text': c['text'], 'keywords': c['keywords']} for c in top_chunks],
        'stats': {'episodes': len(episodes), 'chunks': len(top_chunks), 'topics': len(topic_map)}
    }
    with open('wisdom_data.json', 'w') as f:
        json.dump(wisdom, f, indent=2)

    # Full output (for vector DB ingestion)
    full = {
        'episodes': episodes, 'chunks': all_chunks, 'topics': topic_map,
        'stats': {'episodes': len(episodes), 'total_chunks': len(all_chunks), 'topics': len(topic_map)}
    }
    with open('full_index.json', 'w') as f:
        json.dump(full, f)

    print(f"\nDone!")
    print(f"  Episodes: {len(episodes)}")
    print(f"  Total chunks: {len(all_chunks)}")
    print(f"  Wisdom chunks: {len(top_chunks)}")
    print(f"  Topics: {len(topic_map)}")
    print(f"  Output: wisdom_data.json ({os.path.getsize('wisdom_data.json')/1024:.0f} KB)")
    print(f"  Output: full_index.json ({os.path.getsize('full_index.json')/1024/1024:.1f} MB)")

if __name__ == '__main__':
    main()
