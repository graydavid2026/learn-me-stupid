// Centralized tooltip definitions for SR concepts, tiers, and study tips
// Pattern from Grid Wars inputDefinitions

export interface TooltipDef {
  definition: string;
  formula?: string;
  example?: string;
  impact?: string;
  note?: string;
}

const defs: Record<string, TooltipDef> = {
  // SR Tiers
  'tier-0': {
    definition: 'New card — never reviewed. Will appear immediately in your next study session.',
    impact: 'Start here. Get it right to promote to Tier 1 (4h review).',
  },
  'tier-1': {
    definition: 'First review passed. Card is due again in 4 hours.',
    impact: 'Short-term memory. Another correct answer moves to Tier 2 (1 day).',
  },
  'tier-2': {
    definition: 'Card is reviewed daily. Building short-term retention.',
    impact: 'Getting consistent here is key — next stop is 2-day intervals.',
  },
  'tier-3': {
    definition: 'Reviewed every 2 days. Starting to stick.',
    impact: 'Two more correct reviews and you reach weekly intervals.',
  },
  'tier-4': {
    definition: 'Weekly review. Card is entering medium-term memory.',
    impact: 'The transition from daily to weekly is the biggest retention jump.',
  },
  'tier-5': {
    definition: 'Bi-weekly review. Strong medium-term retention.',
    impact: 'Most cards that reach Tier 5 will eventually be mastered.',
  },
  'tier-6': {
    definition: 'Monthly review. Approaching long-term memory.',
    impact: 'You rarely miss cards at this tier. Almost mastered.',
  },
  'tier-7': {
    definition: 'Quarterly review. Long-term memory established.',
    note: 'Considered "mastered" — only reviewed every 3 months to prevent decay.',
  },
  'tier-8': {
    definition: 'Semi-annual review. Fully mastered.',
    note: 'Highest tier. Reviewed every 6 months as a maintenance check.',
  },

  // Study concepts
  'streak': {
    definition: 'Consecutive days with at least one review session.',
    impact: 'Daily practice is the #1 predictor of long-term retention. Even 5 minutes counts.',
    note: 'Missing a single day resets your streak to zero.',
  },
  'accuracy': {
    definition: 'Percentage of correct answers in today\'s session.',
    formula: 'correct / total × 100',
    example: '18 correct out of 20 = 90% accuracy',
    impact: 'Below 70% suggests cards may be too difficult. Consider breaking them into simpler pieces.',
  },
  'due-today': {
    definition: 'Cards whose review interval has elapsed and are ready for study.',
    impact: 'Reviewing on time maintains optimal spacing. Overdue cards lose retention.',
  },
  'overdue': {
    definition: 'Cards that were due more than 24 hours ago and haven\'t been reviewed.',
    impact: 'Overdue cards may decay to a lower tier, requiring more reviews to re-master.',
  },
  'mastered': {
    definition: 'Cards at Tier 7 or 8 — reviewed quarterly or less.',
    note: 'Mastered doesn\'t mean forgotten. These cards still get periodic reviews.',
  },
  'decay': {
    definition: 'When a card isn\'t reviewed on time, its tier drops automatically.',
    formula: 'If overdue by 2× the interval, drop 1 tier. If 4×, drop 2 tiers.',
    impact: 'Decay prevents false confidence. Cards you stop reviewing lose their tier.',
  },
  'daily-limit': {
    definition: 'Maximum number of new cards introduced per rolling 12-hour window.',
    impact: 'Too many new cards at once overwhelms short-term memory. 10-20/day is optimal.',
    note: 'This only affects new cards (Tier 0). Due reviews are always shown. Budget resets 12h after your last batch.',
  },
  'session-length': {
    definition: 'Target number of cards per study session.',
    impact: 'Shorter, frequent sessions beat long cramming sessions for retention.',
    note: 'Most research suggests 15-25 minutes is ideal.',
  },
};

export default defs;
