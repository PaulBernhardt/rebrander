import type { Rebrander } from "../utils/rebrander.ts";

/**
 * This component displays the progress of the rebranding.
 * It displays the total number of posts, how many have been processed,
 * and a progress bar.
 *
 * @param rebrander - The rebrander object.
 * @returns The RebrandProgress component.
 */
function RebrandProgress({ rebrander }: { rebrander: Rebrander }) {
	return (
		<>
			<p>
				Progress: {rebrander.processed()} of {rebrander.total() ?? "???"}
			</p>
			<p>
				<progress
					value={rebrander.processed()}
					max={rebrander.total() ?? Number.POSITIVE_INFINITY}
				/>
			</p>
		</>
	);
}

export default RebrandProgress;
