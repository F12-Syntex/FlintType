// Twitter scrapers honour `twitter:image` if present, falling back to
// `og:image` otherwise. Re-exporting the OG image keeps the asset
// identical without duplicating the JSX.
export { default, alt, size, contentType, revalidate } from "./opengraph-image";
