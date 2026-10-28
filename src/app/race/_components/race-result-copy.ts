import { formatClock } from "@/lib/format-duration";

/** Plain-language lines for the race results card. */

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function summaryLine(place: number, total: number, time: number): string {
  return `${ordinal(place)} of ${total} in ${formatClock(time)}.`;
}

/** Standing line shown while the room is still racing — the placement
 *  isn't final yet, so we frame it as a live, net-WPM standing that
 *  resettles as each remaining racer crosses. (Finishing first counts
 *  for nothing if the run was inaccurate: net WPM is the score.) */
export function provisionalLine(
  place: number,
  total: number,
  stillRacing: number,
): string {
  const standing = `${ordinal(place)} of ${total}`;
  if (stillRacing <= 0) return `${standing}. Finalising places.`;
  const who = stillRacing === 1 ? "1 racer" : `${stillRacing} racers`;
  return `${standing}, ${who} still typing.`;
}
