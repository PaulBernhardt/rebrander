// @ts-types="solid-js"
import { Show } from "solid-js";
import type { Rebrander } from "../utils/rebrander.ts";
import RebrandErrors from "./RebrandErrors.tsx";
import RebrandProgress from "./RebrandProgress.tsx";
import { RebrandReport } from "./RebrandReport.tsx";

export function Rebranding({
	rebrander,
	url,
}: {
	rebrander: Rebrander;
	url: string;
}) {
	return (
		<>
			<h3>Status: {rebrander.status()}</h3>
			<Show
				when={rebrander.updater()}
				fallback={<RebrandProgress rebrander={rebrander} />}
			>
				{(updater) => <RebrandReport result={updater()} />}
			</Show>
			<RebrandErrors errors={rebrander.postErrors()} url={url} />
		</>
	);
}

export default Rebranding;
