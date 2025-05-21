/// <reference lib="deno.ns" />
import { expect } from "jsr:@std/expect";
import { Ghost, GhostPostSchema, PostFetcher } from "./ghost.ts";
import { TokenGenerator } from "./tokenGenerator.ts";

// Load test configuration
const config: {
	GHOST_ADMIN_API_ID: string;
	GHOST_ADMIN_API_SECRET: string;
} = JSON.parse(await Deno.readTextFile("./test.config.json"));

const tokenGenerator = new TokenGenerator(
	config.GHOST_ADMIN_API_ID,
	config.GHOST_ADMIN_API_SECRET,
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
		"",
	);
	const posts = await postFetcher.next();
	expect(posts).toBeInstanceOf(Array);
	expect(posts.length).toBeGreaterThan(0);
	const post = posts[0];

	// This no longer actually proves we don't fetch all fields since zod strips them client side
	const expectedKeys = new Set(["id", "lexical", "title"]);
	for (const key of Object.keys(post)) {
		expect(expectedKeys.has(key)).toBe(true);
	}
});

Deno.test("Posts - should get posts with target string", async () => {
	const postFetcher = new PostFetcher(
		"https://ghost.glitteringvoid.ca",
		tokenGenerator,
		{
			next: 0,
			limit: 25,
		},
		"The Sunday Star",
	);
	const posts = await postFetcher.next();
	expect(posts).toBeInstanceOf(Array);
	expect(posts.length).toBeGreaterThan(0);
	for (const post of posts) {
		// Ghost's filter is not case sensitive, so we will get false positives
		expect(post.lexical).toMatch(/The Sunday Star/i);
	}
});

Deno.test("ConstructUrl - should construct a url with starting pagination", () => {
	const url = PostFetcher.constructUrl({
		baseUrl: "https://ghost.glitteringvoid.ca",
		pagination: { next: 1, limit: 1 },
		targetString: "test",
		fields: "id,lexical,title",
	});
	expect(url).toBe(
		"https://ghost.glitteringvoid.ca/ghost/api/admin/posts?page=1&limit=1&fields=id%2Clexical%2Ctitle&filter=lexical%3A%7E%27test%27",
	);
});

Deno.test("Posts - hasNest should be true when next has never been called", () => {
	const postFetcher = new PostFetcher(
		"https://ghost.glitteringvoid.ca",
		tokenGenerator,
		{ next: 0, limit: 1 },
	);
	expect(postFetcher.hasNext).toBe(true);
});

Deno.test("Posts - Should have total posts, and next should be callable to fetch every post", async () => {
	const postFetcher = new PostFetcher(
		"https://ghost.glitteringvoid.ca",
		tokenGenerator,
		{ next: 0, limit: 1 },
	);
	await postFetcher.next();
	expect(postFetcher.hasNext).toBe(true);
	const total = postFetcher.total;
	expect(total).toBeGreaterThan(0);
	for (let i = 0; i < total - 1; i++) {
		expect(postFetcher.hasNext).toBe(true);
		const posts = await postFetcher.next();
		expect(posts).toBeInstanceOf(Array);
		expect(posts.length).toBeGreaterThan(0);
	}
	expect(postFetcher.hasNext).toBe(false);
	const posts = await postFetcher.next();
	expect(posts).toBeInstanceOf(Array);
	expect(posts.length).toBe(0);
});

Deno.test("GetPost - Should fetch a post given an id", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});
	const post = await ghost.getPost("682cb17bcd95d800012b7e43");
	expect(GhostPostSchema.check(post)).toBe(true);
	expect(post.id).toBe("682cb17bcd95d800012b7e43");
});

// Deno.test("UpdatePost - Should update a post given an id, target string, and replacement string", async () => {
//   const ghost = new Ghost({
//     url: "https://ghost.glitteringvoid.ca",
//     tokenGenerator,
//   });

//   ghost.update

// })
