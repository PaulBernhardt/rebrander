import {
	// @ts-types="solid-js"
	type Component,
	createSignal,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
	INFO_STATE,
	type InfoStateType,
	type SiteInfo,
} from "../utils/siteInfo.ts";

const Nothing = () => <div />;
const NoUrl = () => <div>Please enter a valid URL</div>;
const NotGhost = () => (
	<div>This does not appear to be a Ghost site, please check the URL</div>
);

const UrlStatus: Record<InfoStateType, Component> = {
	[INFO_STATE.INVALID_URL]: NoUrl,
	[INFO_STATE.INVALID_RESPONSE]: NotGhost,
	[INFO_STATE.UNKNOWN]: NotGhost,
	[INFO_STATE.NONE]: Nothing,
	[INFO_STATE.VALID]: Nothing,
};

function SelectSite({ siteInfo }: { siteInfo: SiteInfo }) {
	const [inputUrl, setInputUrl] = createSignal("");

	return (
		<>
			<h1>Ghost Rebrander</h1>
			<p>Enter the URL of your Ghost site to get started</p>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					siteInfo.setUrl(inputUrl());
				}}
			>
				<input type="url" onInput={(e) => setInputUrl(e.target.value)} />
				<button type="submit">Check</button>
			</form>
			<Dynamic component={UrlStatus[siteInfo.infoState()]} />
		</>
	);
}

export default SelectSite;
