import type { RebranderResult } from "../utils/rebrander.ts";

/**
 * This component displays the final report of the rebranding.
 *
 * @param result - The rebrander result object.
 * @returns The RebrandReport component.
 */
export function RebrandReport({ result }: { result: RebranderResult }) {
	return (
		<>
			<h2>Report</h2>
			<p>Total Posts Checked: {result.total}</p>
			<p>Successfully Updated: {result.success}</p>
			<p>Unable to Update: {result.error}</p>
		</>
	);
}
