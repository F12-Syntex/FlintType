import { DRILL_COPY, type FixedDrillId } from "@/app/drills/_components/drill-catalog";
import type { Finding } from "@/types/typing-analysis";

/** The drill a result's top finding points to (spec-50 §3.6). Only drills
 *  that are never locked: the result screen can't tell which tailored
 *  drills a user has unlocked. Drills need an account, so signed-out
 *  users get no link. */
const DRILL_FOR: Partial<Record<Finding["kind"], FixedDrillId>> = {
  fixing: "tricky",
  left: "tricky",
  before: "top-100-sprint",
  inside: "english-burst",
};

export function practiseLinkFor(
  top: Finding | undefined,
  signedIn: boolean,
): { drillId: FixedDrillId; title: string } | null {
  if (!signedIn || !top) return null;
  const drillId = DRILL_FOR[top.kind];
  return drillId ? { drillId, title: DRILL_COPY[drillId].title } : null;
}
