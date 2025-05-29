import { Show } from "solid-js";
import "./App.css";
import Rebrander from "./components/Rebrander.tsx";
import SelectSite from "./components/SelectSite.tsx";
import { SiteInfoDisplay } from "./components/SiteInfoDisplay.tsx";
import { INFO_STATE, createSiteInfo } from "./utils/siteInfo.ts";

/**
 * The main Rebrander app component takes two optional paramaters, which are exposed
 * in the UI:
 *
 * `concurrentUpdates` controls how many concurrent Post updates are allowed
 * `flakePercentage` is a number between 0 and 1 that controls the probability of
 * the Rebrander server artificially failing to update a Post, if you would like
 * to see the error handling.
 *
 * In addition, it expects a `__REBRANDER_HOST__` constant to be set,
 * which defaults to `http://localhost:8000` but is expected to be set by the
 * build process from an environment variable, controlling where the Rebrander
 * server is running.
 *
 * @param concurrentUpdates - The number of concurrent updates to allow.
 * @param flakePercentage - The percentage of flake to allow.
 * @returns The App component.
 */
function App({
	concurrentUpdates,
	flakePercentage,
}: {
	concurrentUpdates?: number;
	flakePercentage?: number;
} = {}) {
	const rebranderHost = __REBRANDER_HOST__;
	const siteInfo = createSiteInfo(rebranderHost);

	if (flakePercentage) {
		console.log("flakePercentage", flakePercentage);
	}
	if (concurrentUpdates) {
		console.log("concurrentUpdates", concurrentUpdates);
	}
	return (
		<Show
			when={siteInfo.infoState() === INFO_STATE.VALID}
			fallback={<SelectSite siteInfo={siteInfo} />}
		>
			<Show when={siteInfo.info()} fallback={<div>Loading...</div>}>
				{(info) => (
					<>
						<SiteInfoDisplay info={info()} url={siteInfo.url()} />
						<Rebrander
							url={siteInfo.url() ?? ""}
							concurrentUpdates={concurrentUpdates}
							flakePercentage={flakePercentage}
							rebranderHost={rebranderHost}
						/>
					</>
				)}
			</Show>
		</Show>
	);
}

export default App;
