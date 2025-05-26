/// <reference lib="deno.ns" />
import { expect } from "jsr:@std/expect";
import { Ghost, PostFetcher } from "../utils/ghost.ts";
import { GhostPostSchema } from "./schemas.ts";
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
	const site = await Ghost.getSiteInfo("https://ghost.glitteringvoid.ca");
	if (site.isErr()) {
		throw new Error(site.error.message);
	}
	expect(site.value).toMatchObject({
		site: {
			accent_color: "#273d84",

			cover_image:
				"https://ghost.glitteringvoid.ca/content/images/2025/03/V18RVMK1FMAMCYCWNMN0B0RVC0-5.jpg",
			description: "Thoughts, stories and ideas.",
			icon: "https://ghost.glitteringvoid.ca/content/images/2025/03/AYZMQRC6RNYEAB716W52AMW0Z0-1.jpg",

			logo: null,
			title: "The Glittering Void",
		},
	});
});

Deno.test("getSiteInfo - should return an error if the site info is not valid", async () => {
	const site = await Ghost.getSiteInfo("https://speed.cloudflare.com/");
	if (site.isOk()) {
		throw new Error("site is ghost site");
	}
	expect(site.error.type).toBe("GhostSiteInfoError");
});

Deno.test("getPosts - should get a post fetcher", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const posts = await ghost.getPostFetcher();

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
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	for (let i = 0; i < 10; i++) {
		await ghost.createMockPost({
			title: `FILTER TEST ${i}`,
			text: `FILTER TEST double bubble double trouble ${i}`,
		});
	}

	const postFetcher = new PostFetcher(
		"https://ghost.glitteringvoid.ca",
		tokenGenerator,
		{
			next: 0,
			limit: 25,
		},
		"double bubble double trouble",
	);
	let found = 0;
	while (postFetcher.hasNext) {
		const posts = await postFetcher.next();
		expect(posts).toBeInstanceOf(Array);
		for (const { id } of posts) {
			found++;
			const post = await ghost.getPost(id);
			if (post.isErr()) {
				throw new Error("post is null");
			}
			// Ghost's filter is not case sensitive, so we will get false positives
			expect(post.value.lexical).toMatch(/double bubble double trouble/i);
			await ghost.deletePost(id);
		}
	}
	// It will be greater than 10 if it had to clean up from prior failed test runs
	expect(found).toBeGreaterThanOrEqual(10);
});

Deno.test("Posts - should get posts with weird characters", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	for (let i = 0; i < 10; i++) {
		await ghost.createMockPost({
			title: `FILTER TEST WEIRD ${i}`,
			text: `FILTER TEST SECRET TEST Johnson's News & Co ${i}`,
		});
	}

	const postFetcher = new PostFetcher(
		"https://ghost.glitteringvoid.ca",
		tokenGenerator,
		{
			next: 0,
			limit: 25,
		},
		"SECRET TEST Johnson's News & Co",
	);
	let found = 0;
	while (postFetcher.hasNext) {
		const posts = await postFetcher.next();
		expect(posts).toBeInstanceOf(Array);
		for (const { id } of posts) {
			found++;
			const post = await ghost.getPost(id);
			if (post.isErr()) {
				throw new Error("post is null");
			}
			// Ghost's filter is not case sensitive, so we will get false positives
			expect(post.value.lexical).toContain("SECRET TEST Johnson's News & Co");
			await ghost.deletePost(id);
		}
	}
	// It will be greater than 10 if it had to clean up from prior failed test runs
	expect(found).toBeGreaterThanOrEqual(10);
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
		if (status.isErr()) {
			throw new Error(status.error.message);
		}
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

	const status = await ghost.deletePost(postId);
	expect(status).toBe(true);
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
	expect(status).toBe(true);

	const post = await ghost.getPost(postId);
	if (post.isOk()) {
		throw new Error("post was not deleted");
	}
	expect(post.error.type).toBe("GhostPostError");
});

Deno.test("ReplaceTextInPost - Should replace text in a post given an id, target string, and replacement string", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});
	const postId = await ghost.createMockPost({
		title: "Replace me",
		text: "Here is some text, we should replace THIS with something else",
	});
	const result = await ghost.replaceTextInPost(postId, "THIS", "THAT");
	if (result.isErr()) {
		throw new Error(result.error.message);
	}
	expect(result.value).toBe(true);
	const post = await ghost.getPost(postId);
	if (post.isErr()) {
		throw new Error("post is null");
	}
	expect(post.value.lexical).toContain(
		"Here is some text, we should replace THAT with something else",
	);

	const status = await ghost.deletePost(postId);
	expect(status).toBe(true);
});

Deno.test("getAllPostIds - should get all post ids", async (t) => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const expectedPostIds: string[] = [];
	for (let i = 0; i < 100; i++) {
		const postId = await ghost.createMockPost({
			title: `Post ${i}`,
			text: `Post ${i} secret id test string`,
		});
		expectedPostIds.push(postId);
	}
	await t.step("should get all post ids", async () => {
		const postIdsResult = await ghost.getAllPostIds("secret id test string");
		if (postIdsResult.isErr()) {
			throw new Error(postIdsResult.error.message);
		}
		expect(postIdsResult.value).toEqual(
			expect.arrayContaining(expectedPostIds),
		);
	});

	for (const postId of expectedPostIds) {
		await ghost.deletePost(postId);
	}
});
