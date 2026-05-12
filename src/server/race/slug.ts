/** Friendly slugs for challenge rooms — adjective-noun-2digit, e.g.
 *  `quick-otter-42`. Three goals:
 *    1. Memorable enough to share verbally ("quick otter forty two")
 *    2. Long enough that random collisions are rare (~150 × 150 × 90
 *       ≈ 2M combinations)
 *    3. Free of words that read as spammy or unsafe so the share link
 *       doesn't trip phishing instincts when someone sees it in a DM
 *
 *  No homoglyph-prone chars, no leetspeak, no urls inside the words.
 *  Adjectives are positive / neutral; nouns are concrete physical
 *  things. The result is always lowercase ascii. */

const ADJECTIVES = [
  "quick", "swift", "bold", "calm", "bright", "clever", "lucky", "sharp",
  "kind", "brave", "merry", "quiet", "lively", "noble", "humble", "loyal",
  "agile", "vivid", "keen", "neat", "rapid", "sturdy", "sunny", "wild",
  "tidy", "warm", "cool", "deep", "fair", "fine", "fresh", "glad",
  "grand", "jolly", "light", "magic", "mighty", "plucky", "prime", "proud",
  "ready", "regal", "royal", "shiny", "silver", "smart", "snug", "solid",
  "spry", "steady", "stoic", "sure", "tender", "true", "tough", "wise",
  "zesty", "amber", "azure", "brisk", "cobalt", "coral", "cosy", "crisp",
  "dapper", "dusty", "ember", "epic", "frosty", "gentle", "honest", "jade",
  "lemon", "lush", "minty", "misty", "modest", "olive", "patient", "peach",
  "pearl", "polished", "rapid", "rosy", "rugged", "rustic", "sage", "silken",
  "sleek", "smooth", "sound", "spiced", "spruce", "stable", "stately",
  "stout", "sublime", "supreme", "swept", "sworn", "tactic", "tame",
  "tartan", "tidy", "tinted", "topaz", "tranquil", "trim", "trusty", "truthy",
  "twilit", "ultra", "unique", "upbeat", "valiant", "verdant", "vibrant",
  "violet", "vital", "warm", "warty", "watchful", "wayward", "weighty",
  "welcome", "whimsy", "whole", "wholesome", "wild", "willow", "winged",
  "winsome", "witty", "woody", "woven", "yellow", "young", "youthful",
  "zealous", "zen", "amber", "arctic", "ardent",
] as const;

const NOUNS = [
  "otter", "fox", "owl", "lynx", "hawk", "wren", "bear", "stag",
  "moth", "salmon", "deer", "swan", "lion", "tiger", "panda", "wolf",
  "robin", "raven", "heron", "horse", "puffin", "marlin", "kestrel",
  "comet", "nova", "moon", "river", "valley", "ridge", "harbor",
  "meadow", "glade", "forest", "garden", "orchard", "vineyard", "harbor",
  "cottage", "compass", "lantern", "anchor", "candle", "shield", "torch",
  "feather", "ribbon", "ember", "spark", "flame", "frost", "stone",
  "pebble", "pearl", "jewel", "crystal", "marble", "ruby", "opal",
  "amber", "amber", "agate", "topaz", "willow", "maple", "cedar", "birch",
  "ivy", "fern", "rose", "lily", "thistle", "clover", "violet", "poppy",
  "harbor", "tide", "wave", "shore", "cliff", "summit", "atlas", "wagon",
  "lighthouse", "windmill", "fountain", "fanfare", "echo", "shadow", "fable",
  "lullaby", "harvest", "voyage", "saga", "ember", "kindle", "spruce",
  "spruce", "thunder", "twilight", "horizon", "dawn", "dusk", "zephyr",
  "breeze", "snowfall", "frostfern", "songbird", "wildwood", "wildfire",
  "moonbeam", "starlight", "comet", "nebula", "galaxy", "meteor", "orbit",
  "compass", "anchor", "voyager", "wanderer", "pilgrim", "shepherd",
  "scholar", "scribe", "mariner", "captain", "lantern", "lighthouse",
  "drifter", "rambler", "wayfarer", "trekker", "harpoon", "rudder", "kayak",
  "skiff", "canoe", "lighthouse", "shoreline", "outcrop",
] as const;

/** Build one slug from a random adjective + noun + 2-digit suffix.
 *  The suffix knocks the collision rate down by 90× — important
 *  because adjective × noun is ~22 k unique pairs and we want the
 *  registry's collision check to almost never retry. */
function buildOne(rng: () => number): string {
  const a = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)]!;
  const n = NOUNS[Math.floor(rng() * NOUNS.length)]!;
  const suffix = Math.floor(rng() * 90) + 10; // 10..99
  return `${a}-${n}-${suffix}`;
}

/** Generate a slug not already in `existing`. Defaults to crypto-
 *  backed randomness so two simultaneous create calls don't seed off
 *  the same Math.random sequence. Bails after `attempts` (~practically
 *  never hit with a 2M space). */
export function generateSlug(
  existing: ReadonlySet<string>,
  attempts = 8,
  rng: () => number = defaultRng,
): string {
  for (let i = 0; i < attempts; i += 1) {
    const s = buildOne(rng);
    if (!existing.has(s)) return s;
  }
  // Last-resort suffix so we always return *something* unique even
  // under pathological collision (or a deliberately tiny rng for tests).
  return `${buildOne(rng)}-${Date.now() % 1000}`;
}

function defaultRng(): number {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0]! / 0x100000000;
  }
  return Math.random();
}

export const __testing = { ADJECTIVES, NOUNS, buildOne };
