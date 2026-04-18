import logger from '../logger.js';

interface GeneratedCard {
  front: string;
  back: string;
}

interface ClaudeMessage {
  role: string;
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
}

const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Generate flashcards using the Claude API.
 * Returns an array of {front, back} pairs ready for import.
 */
export async function generateCards(
  topic: string,
  count: number,
  style: 'standard' | 'cloze' = 'standard'
): Promise<GeneratedCard[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const clampedCount = Math.max(1, Math.min(20, count));

  const styleInstructions =
    style === 'cloze'
      ? `Create cloze deletion cards. The front should contain a sentence or paragraph with a key term/concept replaced by "{{c1::answer}}" cloze syntax. The back should contain the complete text with the answer revealed.`
      : `Create standard Q&A flashcards. The front should be a clear, specific question. The back should be a comprehensive but concise answer.`;

  const systemPrompt = `You are an expert flashcard creator for spaced repetition learning. Generate high-quality flashcards that:
- Test a single concept per card
- Use clear, unambiguous language
- Have concise fronts (questions) and comprehensive but focused backs (answers)
- Are suitable for long-term retention via spaced repetition
- Avoid trivial or overly broad questions
- Include key details, examples, or mnemonics in the answer when helpful

${styleInstructions}

Return ONLY a valid JSON array of objects with "front" and "back" string fields. No markdown, no explanation, just the JSON array.`;

  const userMessage = `Generate exactly ${clampedCount} flashcard${clampedCount > 1 ? 's' : ''} about: ${topic}`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }] as ClaudeMessage[],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, body: errorBody }, 'Claude API request failed');
    throw new Error(`Claude API error: ${response.status} — ${errorBody.slice(0, 200)}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const textBlock = data.content?.find((c) => c.type === 'text');
  if (!textBlock?.text) {
    throw new Error('No text content in Claude API response');
  }

  // Parse the JSON response — handle markdown code fences if present
  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  let cards: GeneratedCard[];
  try {
    cards = JSON.parse(jsonStr);
  } catch (parseErr) {
    logger.error({ text: jsonStr.slice(0, 500) }, 'Failed to parse Claude card generation response');
    throw new Error('Failed to parse AI-generated cards — invalid JSON');
  }

  if (!Array.isArray(cards)) {
    throw new Error('AI response was not an array of cards');
  }

  // Validate shape
  return cards
    .filter((c) => typeof c.front === 'string' && typeof c.back === 'string')
    .slice(0, clampedCount);
}
