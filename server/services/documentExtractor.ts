import logger from '../logger.js';

interface ExtractedCard {
  front: string;
  back: string;
}

/**
 * Extract text content from a PDF buffer.
 * Uses pdf-parse (v2+) which exports PDFParse as a named class.
 */
export async function extractFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text || '';
}

/**
 * Split extracted text into candidate flashcard Q&A pairs using heuristics.
 * Looks for common patterns: numbered lists, question marks, definitions, bold markers.
 * Falls back to paragraph chunking if no structure is found.
 */
export function splitIntoCards(text: string): ExtractedCard[] {
  const cards: ExtractedCard[] = [];

  // Normalize whitespace
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
  if (!cleaned) return [];

  // Strategy 1: Look for "Q: ... A: ..." or "Question: ... Answer: ..." patterns
  const qaPattern = /(?:^|\n)\s*(?:Q|Question)\s*[:.]\s*(.+?)(?:\n\s*(?:A|Answer)\s*[:.]\s*)([\s\S]+?)(?=\n\s*(?:Q|Question)\s*[:.:]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = qaPattern.exec(cleaned)) !== null) {
    const front = match[1].trim();
    const back = match[2].trim();
    if (front && back) cards.push({ front, back });
  }
  if (cards.length >= 3) return cards;

  // Strategy 2: Numbered list items with question marks
  const numberedQPattern = /(?:^|\n)\s*\d+[.)]\s*(.+?\?)\s*\n([\s\S]+?)(?=\n\s*\d+[.)]\s*|$)/g;
  const numberedCards: ExtractedCard[] = [];
  while ((match = numberedQPattern.exec(cleaned)) !== null) {
    const front = match[1].trim();
    const back = match[2].trim().split('\n').filter((l) => l.trim()).join(' ').slice(0, 500);
    if (front && back) numberedCards.push({ front, back });
  }
  if (numberedCards.length >= 3) return numberedCards;

  // Strategy 3: Definition patterns — "Term: definition" or "Term - definition"
  const defPattern = /(?:^|\n)\s*([A-Z][^:.\n]{2,40})\s*[:–—-]\s*(.+?)(?=\n\s*[A-Z][^:.\n]{2,40}\s*[:–—-]|$)/g;
  const defCards: ExtractedCard[] = [];
  while ((match = defPattern.exec(cleaned)) !== null) {
    const front = `What is ${match[1].trim()}?`;
    const back = match[2].trim();
    if (back.length > 10) defCards.push({ front, back });
  }
  if (defCards.length >= 3) return defCards;

  // Strategy 4: Bold text markers (**term** or similar)
  const boldPattern = /\*\*(.+?)\*\*[:\s]+(.+?)(?=\*\*|$)/g;
  const boldCards: ExtractedCard[] = [];
  while ((match = boldPattern.exec(cleaned)) !== null) {
    const front = `What is ${match[1].trim()}?`;
    const back = match[2].trim();
    if (back.length > 10) boldCards.push({ front, back });
  }
  if (boldCards.length >= 3) return boldCards;

  // Fallback: chunk by paragraphs (double newline separated)
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30 && p.length < 1000);

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    // Try to extract a key sentence as the "question"
    const sentences = p.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
    if (sentences.length >= 2) {
      const front = sentences[0].replace(/[.!]$/, '?');
      const back = sentences.slice(1).join(' ');
      cards.push({ front, back });
    } else if (p.length > 30) {
      // Use first ~60 chars as front, rest as back
      const cutoff = Math.min(80, p.indexOf(' ', 40) > 0 ? p.indexOf(' ', 40) : 60);
      cards.push({
        front: p.slice(0, cutoff).trim() + '...?',
        back: p.trim(),
      });
    }
  }

  return cards.slice(0, 50); // Cap at 50 cards
}
