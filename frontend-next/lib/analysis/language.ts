/**
 * Language detection and classifier routing.
 *
 * Runs before any model call, because which model a comment goes to depends
 * entirely on what language it is in — and neither classifier covers
 * everything (see `classifiers/index.ts`).
 *
 * Detection is deliberately offline and cheap: script detection handles the
 * Indic case outright, and `franc` handles Latin script. No API call, no cost,
 * no rate limit, and it runs on 200 comments in milliseconds.
 */

import { franc } from 'franc';

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  ur: 'Urdu',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  it: 'Italian',
  ru: 'Russian',
  tr: 'Turkish',
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export interface DetectedLanguage {
  code: LanguageCode | 'unknown';
  /** 0–1. Script matches are confident; `franc` on short text is not. */
  confidence: number;
  script: 'latin' | 'devanagari' | 'bengali' | 'tamil' | 'telugu' | 'arabic' | 'cyrillic' | 'other';
  /**
   * Devanagari or Indic-language words written in Latin script ("bhai kya
   * kar rahe ho"). Very common in YouTube comments and the case generic
   * detectors get wrong most often.
   */
  isCodeMixed: boolean;
}

// ─── Script ranges ───────────────────────────────────────────────────────────

const SCRIPT_RANGES = {
  devanagari: /[ऀ-ॿ]/,
  bengali: /[ঀ-৿]/,
  tamil: /[஀-௿]/,
  telugu: /[ఀ-౿]/,
  arabic: /[؀-ۿݐ-ݿ]/,
  cyrillic: /[Ѐ-ӿ]/,
  latin: /[A-Za-z]/,
} as const;

/**
 * Words and endings that appear in Marathi but not Hindi. Both languages use
 * Devanagari, so the script alone cannot separate them — these markers are
 * what actually distinguishes the two.
 */
const MARATHI_MARKERS = [
  'आहे', 'आहेत', 'नाही', 'काय', 'तुम्ही', 'आम्ही', 'मला', 'तुला',
  'त्याने', 'होता', 'होती', 'करतो', 'करते', 'पाहिजे', 'झाले', 'मध्ये',
  'आणि', 'पण', 'कशाला', 'कसं', 'तिथे', 'इथे', 'खूप', 'छान',
];

/** The same for Hindi. Overlap with Marathi is intentional — scoring decides. */
const HINDI_MARKERS = [
  'है', 'हैं', 'नहीं', 'क्या', 'आप', 'हम', 'मुझे', 'तुम्हें',
  'उसने', 'था', 'थी', 'करता', 'करती', 'चाहिए', 'हुआ', 'में',
  'और', 'लेकिन', 'क्यों', 'कैसे', 'वहाँ', 'यहाँ', 'बहुत', 'अच्छा',
];

/**
 * Romanised Hindi/Marathi tokens. Presence of several of these in otherwise
 * Latin text is the signal for code-mixing.
 */
const ROMANISED_INDIC = [
  'hai', 'nahi', 'nahin', 'kya', 'aap', 'hum', 'mujhe', 'tum', 'tumhe',
  'kar', 'karo', 'karta', 'karti', 'raha', 'rahi', 'rahe', 'bhai', 'yaar',
  'accha', 'acha', 'bahut', 'bohot', 'kyu', 'kyun', 'kaise', 'kaisa',
  'mera', 'tera', 'uska', 'hoga', 'thi', 'tha', 'the', 'aur', 'lekin',
  'matlab', 'sahi', 'galat', 'paisa', 'kaam', 'baat', 'log', 'sab',
  'ahe', 'nahe', 'tumhi', 'aamhi', 'mala', 'tula', 'khup', 'chaan',
  'kasa', 'kashala', 'tithe', 'ithe', 'pahije', 'zale', 'ani',
];

// ─── Detection ───────────────────────────────────────────────────────────────

function detectScript(text: string): DetectedLanguage['script'] {
  if (SCRIPT_RANGES.devanagari.test(text)) return 'devanagari';
  if (SCRIPT_RANGES.bengali.test(text)) return 'bengali';
  if (SCRIPT_RANGES.tamil.test(text)) return 'tamil';
  if (SCRIPT_RANGES.telugu.test(text)) return 'telugu';
  if (SCRIPT_RANGES.arabic.test(text)) return 'arabic';
  if (SCRIPT_RANGES.cyrillic.test(text)) return 'cyrillic';
  if (SCRIPT_RANGES.latin.test(text)) return 'latin';
  return 'other';
}

/** How many of `markers` occur in `text`. */
function countMarkers(text: string, markers: readonly string[]): number {
  let hits = 0;
  for (const marker of markers) {
    if (text.includes(marker)) hits++;
  }
  return hits;
}

/**
 * Separates Hindi from Marathi by marker frequency. Both are Devanagari, so
 * when neither side has a clear lead the result is Hindi — it is far more
 * common on YouTube, so it is the better guess under uncertainty.
 */
function disambiguateDevanagari(text: string): {
  code: 'hi' | 'mr';
  confidence: number;
} {
  const marathi = countMarkers(text, MARATHI_MARKERS);
  const hindi = countMarkers(text, HINDI_MARKERS);

  if (marathi === 0 && hindi === 0) return { code: 'hi', confidence: 0.4 };

  const total = marathi + hindi;
  if (marathi > hindi) {
    return { code: 'mr', confidence: Math.min(0.95, 0.6 + marathi / total / 2) };
  }

  return { code: 'hi', confidence: Math.min(0.95, 0.6 + hindi / total / 2) };
}

/** Romanised-Indic token count, used to spot code-mixed Latin text. */
function romanisedIndicScore(text: string): number {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (words.length === 0) return 0;

  const hits = words.filter((w) => ROMANISED_INDIC.includes(w)).length;
  return hits / words.length;
}

/** `franc` returns ISO 639-3; we work in 639-1. */
const FRANC_TO_ISO1: Record<string, LanguageCode> = {
  eng: 'en',
  hin: 'hi',
  mar: 'mr',
  ben: 'bn',
  tam: 'ta',
  tel: 'te',
  urd: 'ur',
  spa: 'es',
  fra: 'fr',
  por: 'pt',
  ita: 'it',
  rus: 'ru',
  tur: 'tr',
};

/**
 * Best guess at what language a comment is in.
 *
 * Order matters: script is checked first because it is decisive where it
 * applies, and `franc` is unreliable on the short, emoji-laden, punctuation-
 * free text that YouTube comments actually consist of.
 */
export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { code: 'unknown', confidence: 0, script: 'other', isCodeMixed: false };
  }

  const script = detectScript(trimmed);

  switch (script) {
    case 'devanagari': {
      const { code, confidence } = disambiguateDevanagari(trimmed);
      return {
        code,
        confidence,
        script,
        // Devanagari alongside Latin is the classic mixed comment.
        isCodeMixed: SCRIPT_RANGES.latin.test(trimmed),
      };
    }
    case 'bengali':
      return { code: 'bn', confidence: 0.9, script, isCodeMixed: false };
    case 'tamil':
      return { code: 'ta', confidence: 0.9, script, isCodeMixed: false };
    case 'telugu':
      return { code: 'te', confidence: 0.9, script, isCodeMixed: false };
    case 'arabic':
      return { code: 'ur', confidence: 0.7, script, isCodeMixed: false };
    case 'cyrillic':
      return { code: 'ru', confidence: 0.85, script, isCodeMixed: false };
  }

  // Latin script: check for romanised Indic before trusting franc, which will
  // happily label "bhai kya kar rahe ho" as English.
  const indicScore = romanisedIndicScore(trimmed);
  if (indicScore >= 0.15) {
    return {
      code: 'hi',
      confidence: Math.min(0.85, 0.5 + indicScore),
      script: 'latin',
      isCodeMixed: true,
    };
  }

  // franc needs a reasonable amount of text; below ~20 characters it guesses.
  if (trimmed.length < 20) {
    return { code: 'en', confidence: 0.3, script: 'latin', isCodeMixed: false };
  }

  const francCode = franc(trimmed, { minLength: 10 });
  const mapped = FRANC_TO_ISO1[francCode];

  if (!mapped) {
    return { code: 'en', confidence: 0.35, script: 'latin', isCodeMixed: false };
  }

  return { code: mapped, confidence: 0.75, script: 'latin', isCodeMixed: false };
}

/** The most frequent language across a set of comments. */
export function dominantLanguage(
  detections: readonly DetectedLanguage[]
): LanguageCode | 'unknown' {
  if (detections.length === 0) return 'unknown';

  const counts = new Map<string, number>();
  for (const d of detections) {
    counts.set(d.code, (counts.get(d.code) ?? 0) + 1);
  }

  let best: string = 'unknown';
  let bestCount = 0;
  for (const [code, count] of counts) {
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }

  return best as LanguageCode | 'unknown';
}

export function languageName(code: string): string {
  return SUPPORTED_LANGUAGES[code as LanguageCode] ?? 'Unknown';
}
