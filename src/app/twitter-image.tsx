// Twitter scrapers honour `twitter:image` if present, falling back to
// `og:image` otherwise. Re-exporting the OG image keeps the asset
// identical without duplicating the JSX.
export { default, alt, size, contentType } from "./opengraph-image";

// Route segment config can't be re-exported — Next.js requires it to be
// statically declared per route. Keep this value in sync with the
// `revalidate` constant in ./opengraph-image.tsx (24h).
export const revalidate = 86_400;
