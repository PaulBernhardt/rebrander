import { hc } from "hono/client";
import { createResource, createSignal } from "solid-js";
import type { ServerApi } from "../../api/main.ts";
import type { GhostSiteInfo } from "../../api/utils/schemas.ts";

const isUrl = (url: string) => {
	try {
		new URL(url);
		return true;
	} catch (e) {
		return false;
	}
};
export const INFO_STATE = {
	INVALID_URL: "Invalid URL",
	INVALID_RESPONSE: "Invalid response",
	UNKNOWN: "Unknown error",
	NONE: "None",
	VALID: "Valid",
	LOADING: "Loading",
} as const;

export type InfoStateType = (typeof INFO_STATE)[keyof typeof INFO_STATE];

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
