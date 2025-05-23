import { expect, fn } from "jsr:@std/expect";
/// <reference lib="deno.ns" />
import { err, ok } from "neverthrow";
import { UPDATE_STATUS, updatePosts } from "../utils/postUpdater.ts";
import { Ghost } from "./ghost.ts";
import { TokenGenerator } from "./tokenGenerator.ts";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const tokenGenerator = new TokenGenerator(
	"ghost-admin-api-id",
	"ghost-admin-api-secret",
);

Deno.test("it should fetch all posts and update them, notifying the callback of status for each post", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const postIds = new Map([
		["123", UPDATE_STATUS.UPDATED],
		["456", UPDATE_STATUS.SKIPPED],
		["789", UPDATE_STATUS.ERROR],
	]);

	ghost.getAllPostIds = fn(() => {
		return Promise.resolve(ok(Array.from(postIds.keys())));
	}) as any;

	const replaceTextInPostStub = fn((postId: string) => {
		switch (postIds.get(postId)) {
			case UPDATE_STATUS.UPDATED:
				return Promise.resolve(ok(true));
			case UPDATE_STATUS.SKIPPED:
				return Promise.resolve(ok(false));
			case UPDATE_STATUS.ERROR:
				return Promise.resolve(err({ message: "error" }));
			default:
				throw new Error("Invalid post ID");
		}
	});
	ghost.replaceTextInPost = replaceTextInPostStub as any;

	const callback = fn();

	const result = await updatePosts(
		"target string",
		"replacement string",
		ghost,
		callback as any,
	);
	if (result.isErr()) {
		throw result.error;
	}

	// Wait for the semaphore to release
	await sleep(1);

	// All posts were checked
	expect(replaceTextInPostStub).toHaveBeenCalledTimes(3);
	// All callbacks were called
	expect(callback).toHaveBeenCalledTimes(3);
	for (const [postId, status] of postIds) {
		expect(callback).toHaveBeenCalledWith(postId, status);
		expect(replaceTextInPostStub).toHaveBeenCalledWith(
			postId,
			"target string",
			"replacement string",
		);
	}
});

Deno.test("it should rate limit when updating posts", async () => {
	const ghost = new Ghost({
		url: "https://ghost.glitteringvoid.ca",
		tokenGenerator,
	});

	const postIds: string[] = [];
	for (let i = 0; i < 100; i++) {
		postIds.push(i.toString());
	}

	ghost.getAllPostIds = fn(async () => {
		await sleep(1000);
		return Promise.resolve(ok(postIds));
	}) as any;

	const replaceTextInPostStub = fn((postId: string) => {
		return Promise.resolve(ok(true));
	});
	ghost.replaceTextInPost = replaceTextInPostStub as any;

	const callback = fn();

	const rateLimit = 10;
	const abort = await updatePosts(
		"target string",
		"replacement string",
		ghost,
		callback as any,
		rateLimit,
	);
	if (abort.isErr()) {
		throw abort.error;
	}
	abort.value();
	await sleep(1000);
	expect(callback).toHaveBeenCalledTimes(10);
});
