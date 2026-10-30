/** The share OG chart's legend: a short line in each series' own stroke,
 *  then its label ("WPM", "RAW"). The swatches copy the chart's marks
 *  exactly (ember 3.5 px and warm grey 2 px, both solid), so the key
 *  never disagrees with the lines it names, and the labels wear the text
 *  ink, never the series colour. Plain satori HTML, because satori can't
 *  draw `<text>` inside an SVG; the chart positions it. */
export function TraceLegend({
  ember,
  warm,
  text,
}: {
  ember: string;
  warm: string;
  /** The label ink. */
  text: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "JetBrains Mono",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.18em",
        color: text,
        lineHeight: 1,
      }}
    >
      <Entry color={ember} weight={3.5} label="WPM" />
      <Entry color={warm} weight={2} label="RAW" />
    </div>
  );
}

function Entry({ color, weight, label }: { color: string; weight: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 14, height: weight, borderRadius: weight, backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
