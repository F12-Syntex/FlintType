/** Curated word and item lists behind the generic drills, plus the
 *  bigrams too common to be worth drilling on purpose. Hand-picked
 *  rather than generated so the sets stay sharp and predictable. */

/** Tongue-twister set: words with awkward bigram density and
 *  cross-hand letter pairs. */
export const TRICKY_WORDS: readonly string[] = [
  "rhythm", "myth", "syzygy", "queue", "bivouac", "phlegm",
  "schism", "subtle", "gnaw", "knack", "wreath", "psalm",
  "yacht", "draught", "scythe", "twelfth", "strengths",
  "sphinx", "thwart", "sequoia", "axiom", "exquisite",
  "zephyr", "knapsack", "wrought", "khaki", "gauche",
  "kowtow", "marquee", "obsequious", "paradigm",
  "rendezvous", "subterfuge", "ubiquitous", "vortex",
  "xylophone", "zymurgy", "cataclysm", "diaphragm",
  "ephemera", "fjord", "ghastly", "haphazard", "iambic",
  "jaunt", "lethargy", "musket", "nymph", "pneumatic",
  "quagmire", "raucous", "tundra", "vexillology",
] as const;

/** Common trigrams worth drilling: heavy in English usage and helped
 *  more by finger-memory reps than by contextual practice. Sorted
 *  roughly by frequency. */
export const HIGH_VALUE_TRIGRAMS: readonly string[] = [
  "the", "ing", "and", "ion", "tio",
  "ent", "for", "ere", "ate", "all",
  "her", "ter", "est", "ers",
  "his", "ith", "ver", "ith",
] as const;

/** Classic pangrams: every letter of the alphabet, no exotic
 *  vocabulary. Hitting threshold WPM on one is a clean signal that
 *  every key is wired in. */
export const PANGRAM_LIST: readonly string[] = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "how vexingly quick daft zebras jump",
  "sphinx of black quartz judge my vow",
  "the five boxing wizards jump quickly",
  "jackdaws love my big sphinx of quartz",
  "amazingly few discotheques provide jukeboxes",
  "crazy fredrick bought many very exquisite opal jewels",
] as const;

/** Sentences mixing letters with numbers and basic punctuation. Drills
 *  the under-practised number row and the comma/period reach without
 *  being so contrived that the hands can't flow. */
export const NUMBERS_AND_SYMBOLS: readonly string[] = [
  "Order 12 boxes by 5pm; ship the rest on Monday.",
  "She typed 90 wpm, paused, then hit 102 on the next run.",
  "Add 3.14 to your column, divide by 7, and round it off.",
  "We met at 8:45 — 30 minutes late for the 9:15 train.",
  "Pay the $42 invoice, then forward the receipt to me.",
  "Run 25 reps, rest for 60s, then go again — 4 sets total.",
  "Versions 1.2.4 and 2.0.0 ship on the same day, no delays.",
  "Email me at user@host.com after the 4th of November.",
] as const;

/** Bigrams that show up in almost every word. Skipping them keeps the
 *  tailored drills targeted: drilling "th" on purpose is pointless
 *  when every regular passage drills it for free. */
export const COMMON_BIGRAMS: ReadonlySet<string> = new Set([
  "th", "he", "in", "er", "an", "re", "on", "at", "en", "nd",
  "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar",
  "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le",
  "ve", "co", "me", "de",
]);
