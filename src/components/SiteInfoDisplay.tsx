import { type Component, Match, Switch } from "solid-js";

import type { GhostSiteInfo } from "../../api/utils/schemas.ts";
import { INFO_STATE, type InfoStateType } from "../utils/siteInfo.ts";

const Nothing = () => <div />;
const NoUrl = () => <div>Please enter a valid URL</div>;
const NotGhost = () => (
	<div>This does not appear to be a Ghost site, please check the URL</div>
);

export const SiteInfoDisplay: Component<{
	info: GhostSiteInfo | null | undefined;
	state: InfoStateType;
}> = (props) => {
	return (
		<Switch fallback={<Nothing />}>
			<Match
				when={
					props.siteInfo === INFO_STATE.INVALID_URL ||
					props.siteInfo === INFO_STATE.UNKNOWN
				}
			>
				<NoUrl />
			</Match>
			<Match when={props.siteInfo === INFO_STATE.INVALID_RESPONSE}>
				<NotGhost />
			</Match>
			<Match
				when={
					props.siteInfo !== undefined &&
					typeof props.siteInfo === "object" &&
					props.siteInfo.site
				}
			>
				{(site) => (
					<div>
						<img
							class="logo"
							src={
								site().logo ??
								site().icon ??
								site().cover_image ??
								"https://ghost.org/images/logos/logo-black-1.webp"
							}
							alt={site().title}
						/>
						<h1>Rebrand: {site().title}</h1>
						<p>{site().description}</p>
					</div>
				)}
			</Match>
		</Switch>
	);
};
