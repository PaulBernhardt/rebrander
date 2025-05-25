// @ts-types="solid-js"
import { Suspense, createSignal } from "solid-js";
import "./App.css";
import { SiteInfoDisplay } from "./components/SiteInfoDisplay.tsx";
import { createSiteInfo } from "./utils/siteInfo.ts";

function App() {
	const siteInfo = createSiteInfo("http://localhost:8000");
	const [inputUrl, setInputUrl] = createSignal("");

	return (
		<>
			<h1>Ghost Rebrander</h1>
			<p>Enter the URL of your Ghost site to get started</p>
			<input type="url" onInput={(e) => setInputUrl(e.target.value)} />
			<button type="button" onClick={() => siteInfo.setUrl(inputUrl())}>
				Check
			</button>
			<Suspense fallback={<div>Loading...</div>}>
				<SiteInfoDisplay info={siteInfo.info()} state={siteInfo.infoState()} />
			</Suspense>
		</>
	);
}

export default App;
