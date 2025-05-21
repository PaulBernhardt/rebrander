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
	if (post.isErr()) {
		throw new Error("post is null");
	}
	expect(GhostPostSchema.safeParse(post.value).success).toBe(true);
	expect(post.value.id).toBe("682cb17bcd95d800012b7e43");
	expect(post.value.title).toBeDefined();
	expect(post.value.lexical).toBeDefined();
});

Deno.test("UpdatePost - Should update a post given an id", async () => {
	const testPostId = "682dd5cfcd95d800012b7e54";
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const randomNumber = Math.floor(Math.random() * 1000000);
	try {
		const post = await ghost.getPost(testPostId);
		if (post.isErr()) {
			throw new Error("post is null");
		}
		post.value.lexical = post.value.lexical.replace(
			/\$\d*\$/,
			`$${randomNumber}$`,
		);
		const status = await ghost.updatePost(testPostId, post.value);
		expect(status).toBe(200);
		const updatedPost = await ghost.getPost(testPostId);
		if (updatedPost.isErr()) {
			throw new Error("error fetching updated post");
		}
		expect(updatedPost.value.lexical).toBeDefined();
		expect(updatedPost.value.lexical).toContain(`$${randomNumber}$`);
	} catch (error) {
		expect(error).toBeUndefined();
	}
});

Deno.test("CreateMockPost - Should create a (mock) post", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const postId = await ghost.createMockPost({
		title: "My new title",
		text: "My new text",
	});

	const post = await ghost.getPost(postId);
	if (post.isErr()) {
		throw new Error("post is null");
	}

	expect(post.value.title).toBe("My new title");
	expect(post.value.lexical).toContain("MOCK POST: My new text");
});

Deno.test("DeletePost - Should delete a post given an id", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const postId = await ghost.createMockPost({
		title: "Delete me",
		text: "Delete me",
	});

	const status = await ghost.deletePost(postId);
	expect(status).toBe(204);

	const post = await ghost.getPost(postId);
	if (post.isOk()) {
		throw new Error("post was not deleted");
	}
	expect(post.error.type).toBe("NotFoundError");
});

// TODO: Handle cases where the post is already being edited

// Deno.test("UpdatePost - Should update a post given an id, target string, and replacement string", async () => {
//   const ghost = new Ghost({
//     url: "https://ghost.glitteringvoid.ca",
//     tokenGenerator,
//   });

//   ghost.update

// })
