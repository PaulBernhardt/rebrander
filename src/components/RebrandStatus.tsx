import type { Rebrander } from "../utils/rebrander.ts";

export function RebrandStatus({ rebrander }: { rebrander: Rebrander }) {
	return (
		<>
			<h3>Status: {rebrander.status()}</h3>
			<p>Total: {rebrander.total()}</p>
			<p>Processed: {rebrander.processed()}</p>
		</>
	);
}
