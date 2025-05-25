import { createEffect } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { createSiteInfo } from "./siteInfo.ts";

// Run these tests against the local server
const localhost = "http://localhost:8000";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("siteInfo", () => {
	it("should fetch site info when given a URL", async () => {
		const siteInfo = createSiteInfo(localhost);
		const test = vi.fn();
		createEffect(() => {
			test(siteInfo.info());
		});

		await siteInfo.setUrl("https://ghost.glitteringvoid.ca");
		while (siteInfo.info.loading) {
			await sleep(100);
		}
		expect(test).toHaveBeenCalledTimes(2);
		expect(siteInfo.info()?.isOk()).toBe(true);
		expect(test).toHaveBeenCalledWith(
			expect.toSatisfy(
				(value) =>
					value?.isOk() &&
					expect(value.value).toMatchObject({
						site: {
							accent_color: "#273d84",
							cover_image:
								"https://ghost.glitteringvoid.ca/content/images/2025/03/V18RVMK1FMAMCYCWNMN0B0RVC0-5.jpg",
							description: "Thoughts, stories and ideas.",
							icon: "https://ghost.glitteringvoid.ca/content/images/2025/03/AYZMQRC6RNYEAB716W52AMW0Z0-1.jpg",
							logo: null,
							title: "The Glittering Void",
						},
					}),
			),
		);
	});

	it("should have an error when given a non-ghost URL", async () => {
		const siteInfo = createSiteInfo(localhost);
		const test = vi.fn();
		createEffect(() => {
			test(siteInfo.info());
		});
		await siteInfo.setUrl("https://example.com");
		while (siteInfo.info.loading) {
			await sleep(100);
		}
		expect(test).toHaveBeenCalledTimes(2);
		expect(siteInfo.info()?.isErr()).toBe(true);
		expect(test).toHaveBeenCalledWith(
			expect.toSatisfy((value) => value?.isErr()),
		);
	});

	it("should have an error when given a non-url", async () => {
		const siteInfo = createSiteInfo(localhost);
		const test = vi.fn();
		createEffect(() => {
			test(siteInfo.info());
		});
		await siteInfo.setUrl("beans");
		while (siteInfo.info.loading) {
			await sleep(100);
		}
		expect(test).toHaveBeenCalledTimes(2);
		expect(siteInfo.info()?.isErr()).toBe(true);
		expect(test).toHaveBeenCalledWith(
			expect.toSatisfy((value) => value?.isErr()),
		);
	});
});
