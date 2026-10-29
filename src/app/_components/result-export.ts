// Save-image export for the result screen.
//
// Captures the result body itself (headline, chart, stat cards and any
// insights). Children marked data-no-export (the settings capsule, the
// actions, the analysis card) are filtered out, and the picture is as
// tall as what's left, so a no-export block in the middle never leaves
// an empty band. The capture sits on a padded page-coloured canvas with
// a small flinttype mark underneath, so the PNG reads as a result card
// rather than a raw screen grab.

const PAD = 32;
const FOOTER = 48;
const LOGO_H = 18;

const exportable = (n: Node) =>
  !(n instanceof HTMLElement && n.dataset.noExport === "true");

/** Height of the capture once data-no-export children are filtered
 *  out: the exportable children's heights plus one row gap between
 *  each, plus 4 px so card shadows aren't clipped. Pure; tested. */
export function exportHeight(
  children: readonly { height: number; exportable: boolean }[],
  gapPx: number,
  scrollHeight: number,
): number {
  const kept = children.filter((c) => c.exportable);
  if (kept.length === 0) return scrollHeight;
  const sum = kept.reduce((a, c) => a + c.height, 0) + gapPx * (kept.length - 1);
  return Math.min(scrollHeight, Math.ceil(sum) + 4);
}

/** The capture node's exported height (see `exportHeight`). */
function contentHeight(node: HTMLElement): number {
  const children = Array.from(node.children).map((child) => ({
    height: child.getBoundingClientRect().height,
    exportable: exportable(child),
  }));
  const gapPx = parseFloat(getComputedStyle(node).rowGap) || 0;
  return exportHeight(children, gapPx, node.scrollHeight);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Render `node` to a branded PNG and trigger the download. Throws if
 *  the capture fails so the caller can show its error state. */
export async function exportResultImage(node: HTMLElement): Promise<void> {
  const [{ toCanvas }, { pickScreenshotBg }] = await Promise.all([
    import("html-to-image"),
    import("@/lib/screenshot"),
  ]);
  const bg = pickScreenshotBg(node);
  const width = node.clientWidth;
  const height = contentHeight(node);

  const shot = await toCanvas(node, {
    cacheBust: true,
    backgroundColor: bg,
    width: width + PAD * 2,
    height: height + PAD,
    style: {
      margin: "0",
      boxSizing: "content-box",
      width: `${width}px`,
      height: `${height}px`,
      padding: `${PAD}px ${PAD}px 0`,
    },
    filter: exportable,
  });
  const ratio = shot.width / (width + PAD * 2);

  const out = document.createElement("canvas");
  out.width = shot.width;
  out.height = shot.height + Math.round(FOOTER * ratio);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(shot, 0, 0);

  // Brand line: the flame + wordmark, bottom-left on the content edge.
  const ink = window.getComputedStyle(node).color || "#000";
  const font = window.getComputedStyle(document.body).fontFamily || "monospace";
  const baseY = shot.height + (FOOTER / 2) * ratio;
  let x = PAD * ratio;
  const logo = await loadImage("/flinttype-logo.svg");
  if (logo) {
    const h = LOGO_H * ratio;
    const w = (logo.naturalWidth / Math.max(1, logo.naturalHeight)) * h || h * 0.6;
    ctx.drawImage(logo, x, baseY - h / 2, w, h);
    x += w + 8 * ratio;
  }
  ctx.fillStyle = ink;
  ctx.font = `700 ${14 * ratio}px ${font}`;
  ctx.textBaseline = "middle";
  ctx.fillText("flinttype", x, baseY);

  const a = document.createElement("a");
  a.href = out.toDataURL("image/png");
  a.download = `flinttype-result-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
