// Twitter scrapers fall back to og:image when no twitter:image is
// present, so technically this file is redundant. We re-export the
// OG handler explicitly so the meta tag *is* emitted (some platforms
// — Discord, Slack — pick the first card kind they find), and so a
// future per-card divergence (Twitter-specific framing, alt text) is
// a one-file edit rather than a copy-paste of the OG layout.
export {
  alt,
  contentType,
  default,
  revalidate,
  size,
} from "./opengraph-image";
