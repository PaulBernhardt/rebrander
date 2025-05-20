/// <reference lib="deno.ns" />
import { expect } from "jsr:@std/expect";
import { Ghost, PostFetcher } from "./ghost.ts";
import { TokenGenerator } from "./tokenGenerator.ts";
const tokenGenerator = new TokenGenerator(
	Deno.env.get("GHOST_ADMIN_API_ID") || "",
	Deno.env.get("GHOST_ADMIN_API_SECRET") || "",
);

Deno.test("getSiteInfo - should get site info", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
	});

	const site = await ghost.getSiteInfo();
	expect(site).toMatchObject({
		site: {
			accent_color: "#273d84",
			allow_external_signup: false,
			cover_image:
				"https://ghost.glitteringvoid.ca/content/images/2025/03/V18RVMK1FMAMCYCWNMN0B0RVC0-5.jpg",
			description: "Thoughts, stories and ideas.",
			icon: "https://ghost.glitteringvoid.ca/content/images/2025/03/AYZMQRC6RNYEAB716W52AMW0Z0-1.jpg",
			locale: "en",
			logo: null,
			title: "The Glittering Void",
			url: "https://ghost.glitteringvoid.ca/",
		},
	});
});

Deno.test("getPosts - should return null with no token generator", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
	});
	const site = await ghost.getPostFetcher();
	expect(site).toBeNull();
});

Deno.test("getPosts - should get a post fetcher", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const posts = await ghost.getPostFetcher();
	if (posts === null) {
		throw new Error("posts is null");
	}
	expect(posts).toBeInstanceOf(PostFetcher);
});

Deno.test("Posts - should get minimal posts", async () => {
	const postFetcher = new PostFetcher(
		"https://ghost.glitteringvoid.ca",
		tokenGenerator,
		{
			page: 1,
			limit: 1,
		},
	);
	const posts = await postFetcher.next();
	expect(posts).toBeInstanceOf(Array);
	expect(posts.length).toBeGreaterThan(0);
	const post = posts[0];
	const expectedKeys = new Set(["id", "lexical", "title"]);
	for (const key of Object.keys(post)) {
		expect(expectedKeys.has(key)).toBe(true);
	}
});
