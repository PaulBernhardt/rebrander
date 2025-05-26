import type { Rebrander } from "../utils/rebrander.ts";

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
