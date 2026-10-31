import { insightsBucketChoiceSchema } from "@/types/insights";

/** The `?tests=` URL parameter for the /insights bucket picker (spec-40
 *  §2). A bucket key ("training|words|25") is written with "~" in place
 *  of "|", so the URL stays readable ("?tests=training~words~25"). The
 *  pooled view is "?tests=training~all". */

export const BUCKET_PARAM = "tests";

/** The bucket key in a `?tests=` value, or null when it is missing or
 *  not a valid key (the page then asks for the default bucket, never a
 *  request the server would reject). */
export function parseBucketParam(value: string | null): string | null {
  if (!value) return null;
  const key = value.replaceAll("~", "|");
  return insightsBucketChoiceSchema.safeParse(key).success ? key : null;
}

export function toBucketParam(key: string): string {
  return key.replaceAll("|", "~");
}

/** The query string after picking `key` (null for the default): the
 *  default bucket is left out, and every other parameter is kept. */
export function bucketQuery(current: string, key: string | null, defaultKey: string | null): string {
  const sp = new URLSearchParams(current);
  if (key === null || key === defaultKey) sp.delete(BUCKET_PARAM);
  else sp.set(BUCKET_PARAM, toBucketParam(key));
  // "~" is unreserved in a URL; URLSearchParams escapes it anyway.
  return sp.toString().replaceAll("%7E", "~");
}
