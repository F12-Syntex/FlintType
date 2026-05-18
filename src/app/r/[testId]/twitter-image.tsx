// Next.js requires route-segment config fields (alt, size, contentType,
// revalidate) to be statically parseable from a top-level const, not
// re-exported through a barrel. Declared inline here; the render handler
// is the only thing safe to re-export from the OG file so the Twitter
// card stays a 1:1 mirror without duplicating the Satori layout.
export const alt = "flinttype run report";
export const size = { width: 1500, height: 787 };
export const contentType = "image/png";
export const revalidate = 86_400;

export { default } from "./opengraph-image";
