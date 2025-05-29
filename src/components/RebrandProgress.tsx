import { Show } from "solid-js";
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
			<Show
				when={rebrander.total() !== 0 && rebrander.total()}
				fallback={<p>Fetching posts...</p>}
			>
				{(total) => (
					<>
						<p>
							Progress: {rebrander.processed()} of {total()}
						</p>
						<p>
							<progress value={rebrander.processed()} max={total()} />
						</p>
					</>
				)}
			</Show>
		</>
	);
}

export default RebrandProgress;
