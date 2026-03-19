import { NextRequest } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface ChunkInput {
  guest: string;
  title: string;
  text: string;
}

function buildAdvisorPrompt(chunks: ChunkInput[]): string {
  const guestContext = chunks
    .map(c => `**${c.guest}** (from "${c.title}"):\n"${c.text}"`)
    .join('\n\n---\n\n');

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

function buildContentPrompt(
  mode: 'linkedin' | 'blog',
  style: string,
  synthesizedAnswer: string
): string {
  const styleInstructions: Record<string, string> = {
    storytelling: 'Write in a narrative style. Open with a relatable scenario or anecdote. Build tension, deliver the insight, and close with a takeaway. Make the reader feel like they lived through a learning moment.',
    contrarian: 'Take a bold, counterintuitive angle. Challenge a widely held belief in the industry. Open with a provocative statement that makes people stop scrolling. Back it up with the substance from the insights.',
    listicle: 'Structure as numbered takeaways that are easy to scan. Each point should be punchy and self-contained. Use clear headers or numbers. Make it bookmarkable.',
    reflection: 'Write in thoughtful first-person. Share the insight as if reflecting on a lesson learned. Be vulnerable and authentic. Make the reader think "I\'ve been there too."',
    'data-driven': 'Lead with frameworks, metrics, or structured thinking. Reference specific methodologies. Make it analytical and substantive. Appeal to the reader\'s logical side.',
    conversational: 'Write like you\'re talking to a smart friend over coffee. Keep it casual, warm, and relatable. Use short sentences. Throw in a rhetorical question or two.',
  };

  const styleGuide = styleInstructions[style] || styleInstructions['conversational'];

  if (mode === 'linkedin') {
    return `You are a thought leadership content writer. Transform the following synthesized advisory board answer into a compelling LinkedIn post.

STYLE: ${style.toUpperCase()}
${styleGuide}

RULES:
- 150-250 words
- Do NOT use the format "I asked X experts..." — be creative and original
- Do NOT list experts by name like a roster — weave insights naturally
- Short paragraphs (1-3 sentences each) with line breaks between them
- Open with a hook that stops the scroll
- Close with a question or call to reflection
- Sound like a real person sharing genuine insight, not a content machine
- No hashtags
- No "Built with PM Advisory Board" or tool attributions

Here is the synthesized answer to transform:

${synthesizedAnswer}`;
  }

  // Blog mode
  return `You are a thought leadership content writer. Transform the following synthesized advisory board answer into a compelling blog post.

STYLE: ${style.toUpperCase()}
${styleGuide}

RULES:
- 500-800 words
- Do NOT use the format "I asked X experts..." — be creative and original
- Do NOT list experts by name like a roster — weave insights naturally into the narrative
- Use a compelling title (prefix with "# ")
- Use subheadings (prefix with "## ") to break up sections
- Write in a clear, engaging voice
- Include actionable takeaways
- Open with a hook paragraph
- Close with a strong conclusion or call to action
- Sound like a real person sharing genuine insight, not a content machine
- No "Built with PM Advisory Board" or tool attributions

Here is the synthesized answer to transform:

${synthesizedAnswer}`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY is not configured. Add it to your environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await request.json();
  const { query, chunks, mode, style, synthesizedAnswer } = body as {
    query?: string;
    chunks?: ChunkInput[];
    mode: string;
    style?: string;
    synthesizedAnswer?: string;
  };

  let systemPrompt: string;
  let userMessage: string;
  let maxTokens: number;

  if (mode === 'advisor') {
    // Advisory mode: synthesize from chunks
    if (!query || !chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing query or chunks' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    systemPrompt = buildAdvisorPrompt(chunks);
    userMessage = query;
    maxTokens = 1500;
  } else if (mode === 'linkedin' || mode === 'blog') {
    // Content generation: transform synthesized answer
    if (!synthesizedAnswer) {
      return new Response(
        JSON.stringify({ error: 'Missing synthesizedAnswer for content generation' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    systemPrompt = buildContentPrompt(mode, style || 'conversational', synthesizedAnswer);
    userMessage = query || 'Generate the content based on the synthesized answer provided.';
    maxTokens = mode === 'blog' ? 2500 : 1500;
  } else {
    return new Response(
      JSON.stringify({ error: 'Invalid mode' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.8,
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
