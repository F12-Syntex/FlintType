import { AppChrome } from "../../_components/app-chrome";
import { DrillRunner } from "../_components/drill-runner";

/** `/drills/<id>`: one drill. Server component so <AppChrome> (whose
 *  footer reads the app version server-side) can wrap the client
 *  runner; all data loading and state live in <DrillRunner>. */
export default async function DrillRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppChrome>
      <DrillRunner id={id} />
    </AppChrome>
  );
}
