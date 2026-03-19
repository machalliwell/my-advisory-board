import { NextRequest } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface ChunkInput {
  guest: string;
  title: string;
  text: string;
}

function buildSystemPrompt(mode: string, chunks: ChunkInput[]): string {
  const guestContext = chunks
    .map(c => `**${c.guest}** (from "${c.title}"):\n"${c.text}"`)
    .join('\n\n---\n\n');

  if (mode === 'linkedin') {
    return `You are the Lenny's Podcast LinkedIn Content Generator — you help product managers create thought-leadership posts based on real quotes from Lenny's Podcast episodes.

Generate a LinkedIn post draft with this structure:
1. HOOK (1-2 lines): A provocative opening that stops the scroll.
2. INSIGHT (3-5 short paragraphs): The core insight, attributed to specific guests. Use their names and real quotes from the transcripts below.
3. YOUR TAKE: Write "[YOUR TAKE: Add 2-3 sentences about how this applies to your own experience]"
4. CTA: End with a question that invites engagement.

Format for LinkedIn: short paragraphs, line breaks between each point, conversational tone. Aim for 150-250 words total.

Here are the real transcript excerpts to draw from:

${guestContext}

IMPORTANT: Only use insights that are actually present in the transcript excerpts above. Attribute advice to the correct guest. Do not invent quotes.`;
  }

  return `You are the Lenny's Podcast Advisory Bot — a tool that synthesizes product management wisdom from real podcast transcript excerpts.

When answering:
1. Synthesize the advice into a clear, actionable answer — don't just list quotes
2. Attribute specific advice to specific guests by name (e.g., "Shreyas Doshi recommends...", "According to Marty Cagan...")
3. Present 2-4 different perspectives from different guests when they exist
4. Note where experts disagree — that's the most valuable insight
5. End with a practical "What to do Monday morning" section with 2-3 concrete actions
6. Keep it conversational but substantive — like advice from a senior PM friend
7. Reference real frameworks mentioned in the transcripts when applicable

Here are the real transcript excerpts to draw from:

${guestContext}

IMPORTANT: Only use insights that are actually present in the transcript excerpts above. Attribute advice to the correct guest. Do not invent quotes or attribute things to guests who didn't say them. If the excerpts don't fully answer the question, say so honestly and share what IS covered.`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY is not configured. Add it to your environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { query, chunks, mode } = await request.json() as {
    query: string;
    chunks: ChunkInput[];
    mode: string;
  };

  if (!query || !chunks || chunks.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing query or chunks' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = buildSystemPrompt(mode, chunks);

  const groqResponse = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    return new Response(
      JSON.stringify({ error: `Groq API error: ${groqResponse.status}`, details: errorText }),
      { status: groqResponse.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Stream the response back to the client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqResponse.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
