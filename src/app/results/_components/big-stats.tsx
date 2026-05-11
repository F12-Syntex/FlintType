import { Stat } from "@/components/ft";

export function BigStats() {
  return (
    <section className="grid grid-cols-2 gap-6 border-b border-ft-line-soft px-5 py-7 sm:grid-cols-3 sm:px-14 lg:grid-cols-6">
      <Stat label="WPM" value="92" delta="+6 vs avg" size="lg" accent bordered />
      <Stat label="ACC" value="97.2%" delta="+0.4 vs avg" size="lg" bordered />
      <Stat label="PEAK" value="118" delta="+12 vs avg" size="lg" bordered />
      <Stat label="STALLS" value="3" delta="−1 vs avg" size="lg" inverse bordered />
      <Stat label="RESETS" value="2" delta="−2 vs avg" size="lg" inverse bordered />
      <Stat
        label="CONSISTENCY"
        value="78"
        suffix="/100"
        delta="−3 vs avg"
        size="lg"
        inverse
      />
    </section>
  );
}
