import type { RebranderResult } from "../utils/rebrander.ts";

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
