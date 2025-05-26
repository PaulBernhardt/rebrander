// @ts-types="solid-js"
import { Show, createSignal } from "solid-js";
import { createRebrander } from "../utils/rebrander.ts";
import RebranderConfig from "./RebranderConfig.tsx";
import { Rebranding } from "./Rebranding.tsx";

function Rebrander({
	url,
	concurrentUpdates,
	flakePercentage,
}: {
	url: string;
	concurrentUpdates?: number;
	flakePercentage?: number;
}) {
	const [config, setConfig] = createSignal<{
		apiKey: string;
		targetString: string;
		replacementString: string;
	}>();
	return (
		<Show when={config()} fallback={<RebranderConfig submit={setConfig} />}>
			{(config) => (
				<>
					<p>
						Replacing "{config().targetString}" with "
						{config().replacementString}" in contents of all posts.
					</p>
					<Rebranding
						rebrander={createRebrander({
							...config(),
							url,
							concurrentUpdates,
							host: "http://localhost:8000",
							flakePercentage,
						})}
						url={url}
					/>
				</>
			)}
		</Show>
	);
}

export default Rebrander;
