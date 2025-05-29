import { Sema } from "async-sema";
import { Hono } from "hono";
import { z } from "zod/v4";
import { Ghost } from "../utils/ghost.ts";
import { GhostTokenSchema } from "../utils/schemas.ts";
import { TokenGenerator } from "../utils/tokenGenerator.ts";

/**
 * The payload of the request to the /create route.
 *
 * To limit load on the Ghost instance, you can set the concurrentRequests
 * parameter, which defaults to 100.
 */
const MockCreateSchema = z.object({
	url: z.url(),
	token: GhostTokenSchema,
	targetString: z.string().min(1),
	count: z.number().min(1),
	concurrentRequests: z.number().min(1).max(1000).default(100),
});

/**
 * The payload of the request to the /delete route
 *
 * You can control the number of concurrent requests to the delete route
 * by setting the concurrentRequests parameter, which defaults to 100.
 *
 * Note that it does not take a target string. All posts created
 * by the mock create route have a special string that will be used
 * to identify and delete them.
 */
const MockDeleteSchema = z.object({
	url: z.url(),
	token: GhostTokenSchema,
	concurrentRequests: z.number().min(1).max(1000).default(100),
});

/**
 * Mock routes for creating and deleting posts.
 *
 * You can use these to create (and delete) test posts in
 * an actual Ghost instance that can then be used with the Updater
 * client.
 *
 * These are very simple posts, and will not be published.
 */
const app = new Hono()
	/**
	 * Create a number of test posts in the Ghost instance.
	 *
	 * The posts will be created with the targetString in the title and text,
	 * plus the word "SUPER_SECRET_TEST_DATA_DELETE_ME" int he body that can be used to identify the posts for later cleanup.
	 *
	 * The posts will not be published.
	 */
	.post("/create", async (c) => {
		const data = await c.req.json();
		const parsed = MockCreateSchema.safeParse(data);
		if (!parsed.success) {
			return c.json({ error: parsed.error.message }, 400);
		}
		const { url, token, targetString, count, concurrentRequests } = parsed.data;
		const [id, secret] = token.split(":");
		const tokenGenerator = new TokenGenerator(id, secret);
		const ghost = new Ghost({ url, tokenGenerator });
		const promises = [];
		const sema = new Sema(concurrentRequests);
		for (let i = 0; i < count; i++) {
			promises.push(
				sema.acquire().then(async () => {
					try {
						await ghost.createMockPost({
							title: `${targetString} ${i}`,
							text: `SUPER_SECRET_TEST_DATA_DELETE_ME ${targetString} ${i}`,
						});
					} catch (e) {
						console.error(e);
					} finally {
						sema.release();
					}
				}),
			);
		}
		await Promise.all(promises);
		return c.json({ success: true });
	})
	/**
	 * Delete all posts in the Ghost instance that were created with the
	 * /create route (as identified by the "SUPER_SECRET_TEST_DATA_DELETE_ME" string in the body).
	 *
	 * This is useful for cleaning up after testing.
	 *
	 * To limit load on the Ghost instance, you can set the concurrentRequests
	 * parameter, which defaults to 100.
	 *
	 * Be careful if the ghost site has actual posts containing the "SUPER_SECRET_TEST_DATA_DELETE_ME" string,
	 * as this will delete them.
	 */
	.post("/delete", async (c) => {
		const data = await c.req.json();
		const parsed = MockDeleteSchema.safeParse(data);
		if (!parsed.success) {
			return c.json({ error: parsed.error.message }, 400);
		}
		const { url, token, concurrentRequests } = parsed.data;
		const [id, secret] = token.split(":");
		const tokenGenerator = new TokenGenerator(id, secret);
		const ghost = new Ghost({ url, tokenGenerator });
		const posts = await ghost.getAllPostIds("SUPER_SECRET_TEST_DATA_DELETE_ME");
		if (posts.isErr()) {
			return c.json({ error: posts.error.message }, 400);
		}

		const sema = new Sema(concurrentRequests);
		const promises = [];
		for (const postId of posts.value) {
			promises.push(
				sema.acquire().then(() => {
					try {
						ghost.deletePost(postId);
					} catch (e) {
						console.error(e);
					} finally {
						sema.release();
					}
				}),
			);
		}
		await Promise.all(promises);
		return c.json({ success: true });
	});

export default app;
