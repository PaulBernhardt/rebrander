// @ts-types="solid-js"
import { Show, createSignal } from "solid-js";
import { createRebrander } from "../utils/rebrander.ts";
import RebranderConfig from "./RebranderConfig.tsx";
import { Rebranding } from "./Rebranding.tsx";

/**
 * Rebrander takes an already validated URL, the host of the Rebrander server, and some
 * optional configuration paramaters. It will then control the rebranding experience,
 * first by loading the RebranderConfig component, which allows the user to enter
 * the target and replacement strings, and then once the config is set, creating a `rebrander`
 * object to give to the Rebranding component to display the Rebranding experience.
 *
 * @param url - The URL of the Ghost instance.
 * @param concurrentUpdates - The number of concurrent updates to allow.
 * @param flakePercentage - This should be 0, unless you want to artifically fail updates to see the error handling behaviour
 * @param rebranderHost - The host of the Rebrander server.
 * @returns The Rebrander component.
 */
function Rebrander({
	url,
	concurrentUpdates,
	flakePercentage,
	rebranderHost,
}: {
	url: string;
	concurrentUpdates?: number;
	flakePercentage?: number;
	rebranderHost: string;
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
							host: rebranderHost,
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
