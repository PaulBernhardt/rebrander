import { Show } from "solid-js";
import "./App.css";
import Rebrander from "./components/Rebrander.tsx";
import SelectSite from "./components/SelectSite.tsx";
import { SiteInfoDisplay } from "./components/SiteInfoDisplay.tsx";
import { INFO_STATE, createSiteInfo } from "./utils/siteInfo.ts";

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
