/** The import dialog's motion (ui-law §13), run by framer-motion: a
 *  step's check, its detail line, each new screen and the drop overlay
 *  fade in as their real work finishes. Under reduced motion each one
 *  renders in place at once. Pure. */

/** How long each piece takes to come in, in ms. */
export const IMPORT_MOTION_MS = { check: 150, detail: 200, screen: 200, drop: 150 } as const;
/** How long the drop overlay takes to go, in ms. */
export const DROP_OUT_MS = 100;

export type MotionPiece = keyof typeof IMPORT_MOTION_MS;
type Pose = { opacity: number; scale?: number; y?: number };

/** Where each piece starts: the check from half size, the detail line
 *  4px higher, the rest from transparent. */
const FROM: Record<MotionPiece, Pose> = {
  check: { opacity: 0, scale: 0.5 },
  detail: { opacity: 0, y: -4 },
  screen: { opacity: 0 },
  drop: { opacity: 0 },
};

const TO = (from: Pose): Pose => ({
  opacity: 1,
  ...(from.scale !== undefined ? { scale: 1 } : {}),
  ...(from.y !== undefined ? { y: 0 } : {}),
});

/** framer-motion props for a piece coming in. `reduce` is
 *  `useReducedMotion()`: true renders the end state with no animation. */
export function enterMotion(piece: MotionPiece, reduce: boolean | null) {
  return {
    initial: reduce ? (false as const) : FROM[piece],
    animate: TO(FROM[piece]),
    transition: { duration: IMPORT_MOTION_MS[piece] / 1000, ease: "easeOut" as const },
  };
}

/** framer-motion `exit` for the drop overlay; none under reduced motion. */
export function dropExit(reduce: boolean | null) {
  return reduce ? undefined : { opacity: 0, transition: { duration: DROP_OUT_MS / 1000, ease: "easeOut" as const } };
}
