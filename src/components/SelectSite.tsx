import {
	// @ts-types="solid-js"
	type Component,
	createSignal,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { endUrlWithSlash } from "../utils/endUrlWithSlash.ts";
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
const Loading = () => <div>Loading...</div>;

/**
 * UrlStatus maps the possible states of a site info object to a component
 * to display.
 */
const UrlStatus: Record<InfoStateType, Component> = {
	[INFO_STATE.INVALID_URL]: NoUrl,
	[INFO_STATE.INVALID_RESPONSE]: NotGhost,
	[INFO_STATE.UNKNOWN]: NotGhost,
	[INFO_STATE.NONE]: Nothing,
	[INFO_STATE.VALID]: Nothing,
	[INFO_STATE.LOADING]: Loading,
};
/**
 * This component allows a user to enter a URL and check if it is a valid Ghost site.
 * It will fire the setUrl signal when a "url" is submitted, and will display
 * a message based on whether the site is valid or not.
 *
 * It will NOT display the site info. This component should likely be removed once a valid
 * site info is fetched from the URL.
 *
 * @param siteInfo - The site info object to set the URL on.
 * @returns The SelectSite component.
 */
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
				<input
					type="url"
					onInput={(e) => setInputUrl(endUrlWithSlash(e.target.value))}
				/>
				<button type="submit">Check</button>
			</form>
			<Dynamic component={UrlStatus[siteInfo.infoState()]} />
		</>
	);
}

export default SelectSite;
