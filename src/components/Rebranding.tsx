// @ts-types="solid-js"
import { Show } from "solid-js";
import type { Rebrander } from "../utils/rebrander.ts";
import RebrandErrors from "./RebrandErrors.tsx";
import RebrandProgress from "./RebrandProgress.tsx";
import { RebrandReport } from "./RebrandReport.tsx";
/**
 * This component takes a rebrander object, and displays the status. It will either
 * show the inprogress indicator, or the final report.
 *
 * On the bottom, it will contain a list of all posts that failed to update, if any, with
 * links to the Ghost editor for each post.
 *
 * @param rebrander - The rebrander object.
 * @param url - The URL of the Ghost instance.
 * @returns The Rebranding component.
 */
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
			<RebrandErrors errors={rebrander.failedUpdates} url={url} />
		</>
	);
}

export default Rebranding;
