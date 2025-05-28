import { hc } from "hono/client";
import { createResource, createSignal } from "solid-js";
import type { ServerApi } from "../../api/main.ts";
import type { GhostSiteInfo } from "../../api/utils/schemas.ts";

/**
 * Checks if a string is a URL, using the URL constructor.
 *
 * @param url - The string to check.
 * @returns True if the string is a valid URL, false otherwise.
 */
const isUrl = (url: string) => {
	try {
		new URL(url);
		return true;
	} catch (e) {
		return false;
	}
};

/**
 * The possible states of the site info fetch.
 */
export const INFO_STATE = {
	/**
	 * The URL is invalid (as determined by {@link isUrl}).
	 */
	INVALID_URL: "Invalid URL",
	/**
	 * The response from where the Ghost site info should be, if the URL is a valid Ghost site, does not match the site info schema.
	 * This likely means that it is not a valid Ghost site.
	 */
	INVALID_RESPONSE: "Invalid response",
	/**
	 * An unknown error occurred while fetching the site info.
	 */
	UNKNOWN: "Unknown error",
	/**
	 * No URL has been set yet.
	 */
	NONE: "None",
	/**
	 * The site info has been fetched successfully. This also means the `info` resource should be resolved.
	 */
	VALID: "Valid",
	/**
	 * `url` is a valid URL, but the response from the server has not been received yet.
	 */
	LOADING: "Loading",
} as const;

export type InfoStateType = (typeof INFO_STATE)[keyof typeof INFO_STATE];

/**
 * Takes the address of the Rebrander API server, and creates a series of signals and resource
 * for determing whether a particular string is actually the base URL of a Ghost site.
 *
 * It exposes a url and infoState signal, along with a url setter. It also returns an `info`
 * resource, which will be triggered when the url is set, resolving to the site info if
 * the URL is a valid Ghost site. Otherwise, it will resolve to null
 *
 * While this is happening, the infoState will be updated with the appropriate {@link INFO_STATE},
 * which can be used to inform the user of the current status of the site info fetch.
 *
 * If any of the errors occur, setUrl can be used again to try to fetch the site info for a different URL.
 *
 * @param host - The host of the Rebrander API server to use to fetch the site info.
 * @returns url - A signal tracking the URL of the potential Ghost site
 * @returns setUrl - A function to set the vaule of the URL signal
 * @returns info - A resource that will resolve to the site info of a Ghost site, if URL points to the root of a valid Ghost site.
 * @returns infoState - A signal that will be updated with the current state of the site info fetch.
 */
export function createSiteInfo(host: string) {
	const client = hc<ServerApi>(host);
	const [url, setUrl] = createSignal<string | null>(null);
	const [infoState, setInfoState] = createSignal<InfoStateType>(
		INFO_STATE.NONE,
	);

	const [info] = createResource<GhostSiteInfo | null, string | null>(
		url,
		async (url) => {
			try {
				if (!url || !isUrl(url)) {
					setInfoState(INFO_STATE.INVALID_URL);
					return null;
				}
				setInfoState(INFO_STATE.LOADING);

				console.log("Fetching info for", url);
				const response = await client.details.$post({
					json: {
						url,
					},
				});
				if (response.ok) {
					console.log("Valid Ghost response");
					const data = await response.json();
					console.log("Data received:", data);
					setInfoState(INFO_STATE.VALID);
					return data;
				}
				console.log("Invalid Ghost response");
				setInfoState(INFO_STATE.INVALID_RESPONSE);
				return null;
			} catch (e: unknown) {
				console.log("Error", e);
				setInfoState(INFO_STATE.UNKNOWN);
				return null;
			}
		},
	);

	return {
		url,
		setUrl,
		info,
		infoState,
	};
}

export type SiteInfo = ReturnType<typeof createSiteInfo>;
