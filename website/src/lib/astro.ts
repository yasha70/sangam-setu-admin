/**
 * Ashtakoota Guna Milan: the 36-point kundli match most Indian families use.
 *
 * It needs only each person's Moon nakshatra (and rashi, which follows from it). Point
 * tables differ slightly between almanacs, so results are labelled as indicative and
 * families are told to confirm with their pandit. Safe to import on the client.
 */

export type Gana = "Deva" | "Manushya" | "Rakshasa";
export type Nadi = "Adi" | "Madhya" | "Antya";
type Animal =
  | "Horse" | "Elephant" | "Sheep" | "Serpent" | "Dog" | "Cat" | "Rat"
  | "Cow" | "Buffalo" | "Tiger" | "Deer" | "Monkey" | "Mongoose" | "Lion";

type NakDef = { name: string; aka: string[]; animal: Animal; gana: Gana; nadi: Nadi; rashis: number[] };

/** The 27 nakshatras in order, with the rashi (or two) each one falls in. The first rashi is the default. */
export const NAKSHATRA_DEFS: NakDef[] = [
  { name: "Ashwini", aka: ["Aswini", "Asvini", "Ashvini"], animal: "Horse", gana: "Deva", nadi: "Adi", rashis: [0] },
  { name: "Bharani", aka: ["Bharni"], animal: "Elephant", gana: "Manushya", nadi: "Madhya", rashis: [0] },
  { name: "Krittika", aka: ["Kritika", "Kruthika", "Karthigai", "Kartika"], animal: "Sheep", gana: "Rakshasa", nadi: "Antya", rashis: [1, 0] },
  { name: "Rohini", aka: [], animal: "Serpent", gana: "Manushya", nadi: "Antya", rashis: [1] },
  { name: "Mrigashira", aka: ["Mrigasira", "Mrigshira", "Mrugasira", "Mrigashirsha", "Makayiram"], animal: "Serpent", gana: "Deva", nadi: "Madhya", rashis: [1, 2] },
  { name: "Ardra", aka: ["Arudra", "Aridra", "Thiruvathirai", "Adra"], animal: "Dog", gana: "Manushya", nadi: "Adi", rashis: [2] },
  { name: "Punarvasu", aka: ["Punarpoosam", "Punarvasoo"], animal: "Cat", gana: "Deva", nadi: "Adi", rashis: [2, 3] },
  { name: "Pushya", aka: ["Pushyami", "Poosam", "Pooyam", "Tishya", "Pusya"], animal: "Sheep", gana: "Deva", nadi: "Madhya", rashis: [3] },
  { name: "Ashlesha", aka: ["Aslesha", "Ayilyam", "Aslesa"], animal: "Cat", gana: "Rakshasa", nadi: "Antya", rashis: [3] },
  { name: "Magha", aka: ["Makha", "Makam", "Magam"], animal: "Rat", gana: "Rakshasa", nadi: "Antya", rashis: [4] },
  { name: "Purva Phalguni", aka: ["Poorva Phalguni", "Purvaphalguni", "Pubba", "Pooram", "Purva Falguni"], animal: "Rat", gana: "Manushya", nadi: "Madhya", rashis: [4] },
  { name: "Uttara Phalguni", aka: ["Uttaraphalguni", "Uthiram", "Uttara Falguni"], animal: "Cow", gana: "Manushya", nadi: "Adi", rashis: [5, 4] },
  { name: "Hasta", aka: ["Hastha", "Hastham", "Atham"], animal: "Buffalo", gana: "Deva", nadi: "Adi", rashis: [5] },
  { name: "Chitra", aka: ["Chitta", "Chithirai", "Chithira"], animal: "Tiger", gana: "Rakshasa", nadi: "Madhya", rashis: [5, 6] },
  { name: "Swati", aka: ["Svati", "Swathi", "Chothi"], animal: "Buffalo", gana: "Deva", nadi: "Antya", rashis: [6] },
  { name: "Vishakha", aka: ["Visakha", "Vishaka", "Visakam", "Vishakam"], animal: "Tiger", gana: "Rakshasa", nadi: "Antya", rashis: [6, 7] },
  { name: "Anuradha", aka: ["Anusham", "Anizham"], animal: "Deer", gana: "Deva", nadi: "Madhya", rashis: [7] },
  { name: "Jyeshtha", aka: ["Jyeshta", "Jyestha", "Kettai", "Triketta"], animal: "Deer", gana: "Rakshasa", nadi: "Adi", rashis: [7] },
  { name: "Mula", aka: ["Moola", "Moolam", "Mool"], animal: "Dog", gana: "Rakshasa", nadi: "Adi", rashis: [8] },
  { name: "Purva Ashadha", aka: ["Poorvashada", "Purvashadha", "Pooradam", "Purva Shadha", "Purvashada"], animal: "Monkey", gana: "Manushya", nadi: "Madhya", rashis: [8] },
  { name: "Uttara Ashadha", aka: ["Uttarashadha", "Uthradam", "Uttarashada", "Uttara Shadha"], animal: "Mongoose", gana: "Manushya", nadi: "Antya", rashis: [9, 8] },
  { name: "Shravana", aka: ["Sravana", "Shravan", "Thiruvonam", "Sravanam"], animal: "Monkey", gana: "Deva", nadi: "Antya", rashis: [9] },
  { name: "Dhanishta", aka: ["Dhanishtha", "Shravishtha", "Avittam", "Dhanista"], animal: "Lion", gana: "Rakshasa", nadi: "Madhya", rashis: [9, 10] },
  { name: "Shatabhisha", aka: ["Satabhisha", "Shatabhishak", "Sathayam", "Shatataraka", "Satabhisham"], animal: "Horse", gana: "Rakshasa", nadi: "Adi", rashis: [10] },
  { name: "Purva Bhadrapada", aka: ["Poorvabhadra", "Purvabhadra", "Poorattathi", "Purva Bhadra"], animal: "Lion", gana: "Manushya", nadi: "Adi", rashis: [10, 11] },
  { name: "Uttara Bhadrapada", aka: ["Uttarabhadra", "Uthrattathi", "Uttara Bhadra"], animal: "Cow", gana: "Manushya", nadi: "Madhya", rashis: [11] },
  { name: "Revati", aka: ["Revathi", "Revathy"], animal: "Elephant", gana: "Deva", nadi: "Antya", rashis: [11] },
];

export const NAKSHATRAS = NAKSHATRA_DEFS.map((n) => n.name);

type Planet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
type Vashya = "Chatushpada" | "Manava" | "Jalachara" | "Vanachara" | "Keeta";

/** Rashis in order from Mesh (Aries). Names match RASHI in options.ts. */
export const RASHI_DEFS: { name: string; english: string; lord: Planet; varna: number; vashya: Vashya }[] = [
  { name: "Mesh", english: "Aries", lord: "Mars", varna: 3, vashya: "Chatushpada" },
  { name: "Vrishabh", english: "Taurus", lord: "Venus", varna: 2, vashya: "Chatushpada" },
  { name: "Mithun", english: "Gemini", lord: "Mercury", varna: 1, vashya: "Manava" },
  { name: "Kark", english: "Cancer", lord: "Moon", varna: 4, vashya: "Jalachara" },
  { name: "Simha", english: "Leo", lord: "Sun", varna: 3, vashya: "Vanachara" },
  { name: "Kanya", english: "Virgo", lord: "Mercury", varna: 2, vashya: "Manava" },
  { name: "Tula", english: "Libra", lord: "Venus", varna: 1, vashya: "Manava" },
  { name: "Vrishchik", english: "Scorpio", lord: "Mars", varna: 4, vashya: "Keeta" },
  { name: "Dhanu", english: "Sagittarius", lord: "Jupiter", varna: 3, vashya: "Manava" },
  { name: "Makar", english: "Capricorn", lord: "Saturn", varna: 2, vashya: "Jalachara" },
  { name: "Kumbh", english: "Aquarius", lord: "Saturn", varna: 1, vashya: "Manava" },
  { name: "Meen", english: "Pisces", lord: "Jupiter", varna: 4, vashya: "Jalachara" },
];

export const rashiLabel = (i: number) => `${RASHI_DEFS[i].name} (${RASHI_DEFS[i].english})`;

const VARNA_NAMES = ["", "Shudra", "Vaishya", "Kshatriya", "Brahmin"];

// Rows: groom, columns: bride. Order follows the Vashya type above.
const VASHYA_ORDER: Vashya[] = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"];
const VASHYA_TABLE = [
  [2, 1, 1, 0, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0, 0, 1, 2, 0],
  [1, 1, 1, 0, 2],
];

const ANIMALS: Animal[] = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"];
const YONI_TABLE = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

const FRIENDS: Record<Planet, { friends: Planet[]; enemies: Planet[] }> = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], enemies: ["Sun", "Moon", "Mars"] },
};

// Rows: groom, columns: bride (Deva, Manushya, Rakshasa)
const GANAS: Gana[] = ["Deva", "Manushya", "Rakshasa"];
const GANA_TABLE = [
  [6, 5, 1],
  [5, 6, 0],
  [1, 0, 6],
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z]/g, "")
    .replace(/(aa)/g, "a")
    .replace(/(ee)/g, "i")
    .replace(/(oo)/g, "u")
    .replace(/w/g, "v")
    .replace(/([bcdgkpst])h/g, "$1")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");

const NAK_INDEX = new Map<string, number>();
NAKSHATRA_DEFS.forEach((n, i) => [n.name, ...n.aka].forEach((a) => NAK_INDEX.set(norm(a), i)));

/** Finds a nakshatra from what someone typed ("Mrigasira", "Poorva Phalguni", "Revathi"…). */
export function findNakshatra(text?: string): number | null {
  if (!text?.trim()) return null;
  const key = norm(text.split("(")[0]);
  if (NAK_INDEX.has(key)) return NAK_INDEX.get(key)!;
  if (key.length >= 6) for (const [k, i] of NAK_INDEX) if (k.length >= 6 && (key.startsWith(k) || k.startsWith(key))) return i;
  return null;
}

/** Finds a rashi from "Mesh (Aries)", "Aries", "Mesha", "Vrishchik"… */
export function findRashi(text?: string): number | null {
  if (!text?.trim()) return null;
  const t = norm(text);
  const i = RASHI_DEFS.findIndex((r) => t.startsWith(norm(r.name)) || t.includes(norm(r.english)));
  return i >= 0 ? i : null;
}

export type Koota = { key: string; name: string; meaning: string; got: number; max: number; note: string };

export type GunaResult = {
  total: number;
  max: 36;
  verdict: string;
  tone: "great" | "good" | "fair" | "low";
  kootas: Koota[];
  doshas: string[];
  groom: { nakshatra: string; rashi: string };
  bride: { nakshatra: string; rashi: string };
};

type Moon = { nak: number; rashi: number };

/** Moon position from a biodata's nakshatra and rashi fields. Rashi follows the nakshatra when it's missing or doesn't fit. */
export function moonFrom(nakshatra?: string, rashi?: string): Moon | null {
  const nak = findNakshatra(nakshatra);
  if (nak === null) return null;
  const allowed = NAKSHATRA_DEFS[nak].rashis;
  const r = findRashi(rashi);
  return { nak, rashi: r !== null && allowed.includes(r) ? r : allowed[0] };
}

function maitri(a: Planet, b: Planet) {
  if (a === b) return 5;
  const view = (x: Planet, y: Planet) => (FRIENDS[x].friends.includes(y) ? "f" : FRIENDS[x].enemies.includes(y) ? "e" : "n");
  const pair = [view(a, b), view(b, a)].sort().join("");
  return ({ ff: 5, fn: 4, nn: 3, ef: 1, en: 0.5, ee: 0 } as Record<string, number>)[pair] ?? 0;
}

const taraOk = (from: number, to: number) => {
  const count = ((to - from + 27) % 27) + 1;
  return ![3, 5, 7].includes(count % 9);
};

export function gunaMilan(groom: Moon, bride: Moon): GunaResult {
  const gN = NAKSHATRA_DEFS[groom.nak];
  const bN = NAKSHATRA_DEFS[bride.nak];
  const gR = RASHI_DEFS[groom.rashi];
  const bR = RASHI_DEFS[bride.rashi];

  const varna = gR.varna >= bR.varna ? 1 : 0;
  const vashya = VASHYA_TABLE[VASHYA_ORDER.indexOf(gR.vashya)][VASHYA_ORDER.indexOf(bR.vashya)];
  const tara = (taraOk(bride.nak, groom.nak) ? 1.5 : 0) + (taraOk(groom.nak, bride.nak) ? 1.5 : 0);
  const yoni = YONI_TABLE[ANIMALS.indexOf(gN.animal)][ANIMALS.indexOf(bN.animal)];
  const graha = maitri(gR.lord, bR.lord);
  const gana = GANA_TABLE[GANAS.indexOf(gN.gana)][GANAS.indexOf(bN.gana)];
  const dist = ((groom.rashi - bride.rashi + 12) % 12) + 1;
  const bhakoot = [2, 12, 5, 9, 6, 8].includes(dist) ? 0 : 7;
  const nadi = gN.nadi === bN.nadi ? 0 : 8;

  const kootas: Koota[] = [
    { key: "varna", name: "Varna", meaning: "Temperament and outlook", got: varna, max: 1, note: `${VARNA_NAMES[gR.varna]} and ${VARNA_NAMES[bR.varna]}` },
    { key: "vashya", name: "Vashya", meaning: "Mutual attraction", got: vashya, max: 2, note: `${gR.vashya} and ${bR.vashya}` },
    { key: "tara", name: "Tara", meaning: "Health and fortune", got: tara, max: 3, note: tara === 3 ? "Both star counts are favourable" : tara ? "One star count is favourable" : "Star counts are unfavourable" },
    { key: "yoni", name: "Yoni", meaning: "Physical compatibility", got: yoni, max: 4, note: gN.animal === bN.animal ? `Both ${gN.animal}` : `${gN.animal} and ${bN.animal}` },
    { key: "graha", name: "Graha Maitri", meaning: "Friendship and understanding", got: graha, max: 5, note: gR.lord === bR.lord ? `Same lord, ${gR.lord}` : `${gR.lord} and ${bR.lord}` },
    { key: "gana", name: "Gana", meaning: "Nature and behaviour", got: gana, max: 6, note: gN.gana === bN.gana ? `Both ${gN.gana}` : `${gN.gana} and ${bN.gana}` },
    { key: "bhakoot", name: "Bhakoot", meaning: "Love, family and prosperity", got: bhakoot, max: 7, note: dist === 1 ? "Same rashi" : `Rashis sit ${dist}–${(14 - dist) % 12 || 12} from each other` },
    { key: "nadi", name: "Nadi", meaning: "Health and children", got: nadi, max: 8, note: nadi ? `${gN.nadi} and ${bN.nadi}` : `Both ${gN.nadi} nadi` },
  ];
  const total = kootas.reduce((n, k) => n + k.got, 0);

  const doshas: string[] = [];
  if (!nadi) doshas.push("Nadi dosha: both have the same nadi. Pandits often check for exceptions, such as the same rashi with different nakshatras.");
  if (!bhakoot) doshas.push("Bhakoot dosha: the rashis sit in a 2–12, 5–9 or 6–8 position. It is often considered cancelled when the rashi lords are the same or friends.");

  const tone = total >= 33 ? "great" : total >= 25 ? "good" : total >= 18 ? "fair" : "low";
  const verdict = {
    great: "Excellent match",
    good: "Very good match",
    fair: "Acceptable match",
    low: "Below the usual 18-point minimum",
  }[tone];

  return {
    total,
    max: 36,
    verdict,
    tone,
    kootas,
    doshas,
    groom: { nakshatra: gN.name, rashi: rashiLabel(groom.rashi) },
    bride: { nakshatra: bN.name, rashi: rashiLabel(bride.rashi) },
  };
}

type Astro = { gender: "male" | "female"; nakshatra?: string; rashi?: string; manglik?: string };

/** Guna Milan between two biodatas, or the reason it can't be worked out. */
export function gunaBetween(a: Astro, b: Astro): { result: GunaResult | null; missing: ("you" | "them")[]; manglikNote: string | null } {
  const ma = moonFrom(a.nakshatra, a.rashi);
  const mb = moonFrom(b.nakshatra, b.rashi);
  const missing: ("you" | "them")[] = [];
  if (!ma) missing.push("you");
  if (!mb) missing.push("them");
  let manglikNote: string | null = null;
  const yes = (m?: string) => m === "Yes" || m?.startsWith("Anshik");
  const no = (m?: string) => m === "No";
  if ((yes(a.manglik) && no(b.manglik)) || (no(a.manglik) && yes(b.manglik))) manglikNote = "One of you is Manglik. Families usually ask their pandit about this.";
  else if (yes(a.manglik) && yes(b.manglik)) manglikNote = "Both are Manglik, which is traditionally considered balanced.";
  if (!ma || !mb || a.gender === b.gender) return { result: null, missing, manglikNote };
  const [groom, bride] = a.gender === "male" ? [ma, mb] : [mb, ma];
  return { result: gunaMilan(groom, bride), missing, manglikNote };
}
