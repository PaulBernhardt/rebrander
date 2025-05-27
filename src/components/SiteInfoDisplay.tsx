import type { Component } from "solid-js";

import type { GhostSiteInfo } from "../../api/utils/schemas.ts";

/**
 * This component displays the site info for a Ghost instance.
 * Specifically, it displays the title, description, and an image.
 *
 * @param info - The site info.
 * @param url - The URL of the Ghost instance.
 * @returns The SiteInfoDisplay component.
 */
export const SiteInfoDisplay: Component<{
	info: GhostSiteInfo;
	url: string | null;
}> = ({ info, url }) => {
	return (
		<div>
			<img
				class="logo"
				src={
					info.site.logo ??
					info.site.icon ??
					info.site.cover_image ??
					"https://ghost.org/images/logos/logo-black-1.webp"
				}
				alt={info.site.title}
			/>
			<h1>Rebrand: {info.site.title}</h1>
			<p>
				<a href={url ?? ""}>{url ?? "No URL"}</a>
			</p>
			<p>{info.site.description}</p>
		</div>
	);
};
