// @ts-types="solid-js"
import { Show, createSignal } from "solid-js";
import { createRebrander } from "../utils/rebrander.ts";
import RebranderConfig from "./RebranderConfig.tsx";
import { Rebranding } from "./Rebranding.tsx";

function Rebrander({
	url,
	concurrentUpdates,
}: {
	url: string;
	concurrentUpdates?: number;
}) {
	const [config, setConfig] = createSignal<{
		apiKey: string;
		targetString: string;
		replacementString: string;
	}>();
	return (
		<Show when={config()} fallback={<RebranderConfig submit={setConfig} />}>
			{(config) => (
				<Rebranding
					rebrander={createRebrander({
						...config(),
						url,
						concurrentUpdates,
						host: "http://localhost:8000",
					})}
					url={url}
				/>
			)}
		</Show>
	);
}

export default Rebrander;
