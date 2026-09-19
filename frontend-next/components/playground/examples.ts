/**
 * Clickable sample texts for the playground.
 *
 * Chosen to cover the routing decisions rather than the severity range: one
 * line per case that sends the text down a different path — English to XLM-R,
 * Devanagari and romanised Hindi to MuRIL — plus a sarcastic English line that
 * contains no abusive word at all. That last one is the point of the page: a
 * keyword filter passes it, and the language-model pass does not.
 *
 * Deliberately mild throughout. No slurs, nothing graphic — the tool has to be
 * demonstrable in public.
 */

export interface ExamplePrompt {
  /** Short button text; the full sentence goes in the tooltip. */
  label: string;
  /** What this example is here to demonstrate. */
  hint: string;
  text: string;
}

export const EXAMPLE_PROMPTS: readonly ExamplePrompt[] = [
  {
    label: 'English · neutral',
    hint: 'Routed to XLM-RoBERTa',
    text: 'Thanks for the detailed walkthrough, this really helped me understand the topic.',
  },
  {
    label: 'English · hostile',
    hint: 'Plain insult, routed to XLM-RoBERTa',
    text: 'You are completely clueless and everyone in the comments can see it.',
  },
  {
    label: 'Sarcasm',
    hint: 'No abusive word in it — a keyword filter passes this',
    text: "Wow, what a genius. Truly nobody else could have thought of something that brilliant.",
  },
  {
    label: 'हिन्दी · Devanagari',
    hint: 'Devanagari script, routed to MuRIL',
    text: 'यह वीडियो बहुत अच्छा है, आपने सब कुछ बहुत अच्छे से समझाया।',
  },
  {
    label: 'Hinglish · romanised',
    hint: 'Latin script, Hindi words — the case generic detectors miss',
    text: 'Bhai ye kya bakwas hai, tumhe kuch nahi aata aur tum log bas time waste karte ho.',
  },
  {
    label: 'Mixed script',
    hint: 'Devanagari and Latin in one comment',
    text: 'Honestly bhai यह बहुत बकवास content है, kuch naya try karo.',
  },
];
