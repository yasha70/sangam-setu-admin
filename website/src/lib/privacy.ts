/**
 * Hides phone numbers, email addresses and WhatsApp/Telegram links in anything members
 * write to each other, so contact happens through the app until both families are ready.
 * Catches the usual tricks: spaces or dashes between digits, +91 and 0 prefixes, and
 * numbers spelt out in English or Hindi words. Safe to import on the client.
 */

export const HIDDEN = { phone: "📵 number hidden", email: "📵 email hidden", link: "📵 link hidden" };

// Digits joined by up to three separator characters, at least 9 digits in all.
const DIGIT_RUN = /\(?\+?\d(?:[\s\-.()/_*]{0,3}\d){8,}/g;

// Number words in English and Hindi (Latin script), plus "double"/"triple".
const WORDS = [
  "zero", "oh", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "shunya", "sunya", "ek", "do", "teen", "tin", "char", "chaar", "paanch", "panch", "chhe", "chhah", "che", "chah", "saat", "sat", "aath", "aat", "nau", "no",
  "double", "triple", "dubble", "tripple",
];
const WORD_TOKEN = `(?:${WORDS.join("|")}|\\d)`;
const WORD_RUN = new RegExp(`\\b${WORD_TOKEN}(?:[\\s,\\-.]+${WORD_TOKEN}){6,}\\b`, "gi");

const DOT = String.raw`(?:\.|\s*\(dot\)\s*|\s*\[dot\]\s*|\s+dot\s+)`;
const AT = String.raw`(?:\s*@\s*|\s*\(at\)\s*|\s*\[at\]\s*|\s+at\s+)`;
const EMAIL = new RegExp(String.raw`[\w+-]+(?:${DOT}[\w+-]+)*${AT}[\w-]+(?:${DOT}[\w-]+)*${DOT}(?:com|in|net|org|co|edu|gov|me|io|info|biz|us|uk)\b`, "gi");
const LINK = /\b(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|telegram\.dog)\/\S*/gi;

export type Masked = { text: string; hidden: number };

/** Replaces contact details with a short placeholder and reports how many were hidden. */
export function maskContacts(input: string): Masked {
  if (!input) return { text: input, hidden: 0 };
  let hidden = 0;
  let text = input.replace(LINK, () => {
    hidden++;
    return HIDDEN.link;
  });
  text = text.replace(EMAIL, () => {
    hidden++;
    return HIDDEN.email;
  });
  text = text.replace(DIGIT_RUN, (m) => {
    if (m.replace(/\D/g, "").length < 9) return m;
    hidden++;
    return HIDDEN.phone;
  });
  text = text.replace(WORD_RUN, (m) => {
    // Needs at least 7 number words or digits to count as a spelt-out number.
    const tokens = m.split(/[\s,\-.]+/).filter(Boolean);
    if (tokens.length < 7) return m;
    hidden++;
    return HIDDEN.phone;
  });
  return { text, hidden };
}

/** Quick check for showing a hint before someone sends. */
export function hasContact(text: string) {
  return maskContacts(text).hidden > 0;
}
