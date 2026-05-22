/**
 * Body of the grant-tag CLI — see scripts/grant-tag.ts for the
 * env-load rationale (ES imports hoist above env loading, so Clerk
 * must be a dynamic import after the entry populates process.env).
 *
 * Grants or revokes a user-identity tag by merging it into the user's
 * Clerk `publicMetadata.tags`. This is the manual grant path described
 * in docs/ui-law.md §14.2 — the same metadata `resolveEligibleTags`
 * reads on every leaderboard/profile render. The tag math reuses the
 * already-tested helpers in src/lib/user-tags so canonical ordering and
 * dedupe stay single-sourced.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { parseUserTags, withUserTag } from "@/lib/user-tags";
import { isUserTagId, USER_TAG_IDS, type UserTagId } from "@/types/user-tag";

function usage(msg?: string): never {
  if (msg) console.error(`\n${msg}`);
  console.error(
    [
      "",
      "Usage:",
      "  yarn grant-tag <tag> <email|userId> [--remove] [--dry-run]",
      "",
      `  <tag>           one of: ${USER_TAG_IDS.join(", ")}`,
      "  <email|userId>  the user's email, or their Clerk user id (user_…)",
      "  --remove        revoke the tag instead of granting it",
      "  --dry-run       show what would change, write nothing",
      "",
      "Examples:",
      "  yarn grant-tag whitehat someone@example.com",
      "  yarn grant-tag whitehat user_2abc... --remove",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

export async function run() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positionals = args.filter((a) => !a.startsWith("--"));

  const unknownFlag = [...flags].find(
    (f) => f !== "--remove" && f !== "--dry-run",
  );
  if (unknownFlag) usage(`Unknown flag: ${unknownFlag}`);
  const remove = flags.has("--remove");
  const dryRun = flags.has("--dry-run");

  const [tagArg, identifier, ...rest] = positionals;
  if (!tagArg || !identifier) usage("Missing <tag> and/or <email|userId>.");
  if (rest.length > 0) usage(`Unexpected extra argument: ${rest[0]}`);

  const tag = tagArg.toLowerCase();
  if (!isUserTagId(tag)) {
    usage(`"${tagArg}" is not a known tag. Known: ${USER_TAG_IDS.join(", ")}.`);
  }

  const client = await clerkClient();

  // An "@"-bearing string is an email lookup; anything else is treated
  // as a Clerk user id (user_…).
  let user;
  try {
    if (identifier.includes("@")) {
      const { data } = await client.users.getUserList({
        emailAddress: [identifier],
        limit: 2,
      });
      if (data.length === 0) usage(`No Clerk user with email ${identifier}.`);
      if (data.length > 1) {
        usage(
          `Multiple Clerk users match ${identifier}; pass their user id (user_…) instead.`,
        );
      }
      user = data[0]!;
    } else {
      user = await client.users.getUser(identifier);
    }
  } catch (err) {
    console.error(
      "\nClerk lookup failed:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }

  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const current = parseUserTags(meta.tags);
  const next: UserTagId[] = remove
    ? current.filter((t) => t !== tag)
    : withUserTag(current, tag);

  const email = user.emailAddresses[0]?.emailAddress ?? "(no email)";
  const noop =
    next.length === current.length && next.every((t, i) => t === current[i]);

  console.log(
    JSON.stringify(
      {
        action: remove ? "revoke" : "grant",
        tag,
        userId: user.id,
        email,
        current,
        next,
        dryRun,
        noop,
      },
      null,
      2,
    ),
  );

  if (noop) {
    console.log(
      `\nNo change — ${email} ${
        remove ? "doesn't have" : "already has"
      } the "${tag}" tag.`,
    );
    process.exit(0);
  }

  if (dryRun) {
    console.log(
      "\n--dry-run: nothing written. Re-run without --dry-run to apply.",
    );
    process.exit(0);
  }

  try {
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: { ...meta, tags: next },
    });
  } catch (err) {
    console.error(
      "\nClerk update failed:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }

  console.log(
    `\nDone — ${remove ? "revoked" : "granted"} "${tag}" for ${email}. ` +
      "It can take ~30s to appear on cached surfaces (leaderboard, friends).",
  );
  process.exit(0);
}
