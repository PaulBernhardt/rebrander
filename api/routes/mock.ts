import { Hono } from "hono";
import { z } from "zod";
import { Ghost } from "../utils/ghost.ts";
import { TokenGenerator } from "../utils/tokenGenerator.ts";

const MockCreateSchema = z.object({
	url: z.string().url(),
	token: z.string().regex(/^[0-9]+:[0-9]+$/),
	targetString: z.string().min(1),
	count: z.number().min(1),
});

const MockDeleteSchema = z.object({
	url: z.string().url(),
	token: z.string().regex(/^[0-9]+:[0-9]+$/),
});

const app = new Hono()
	.post("/create", async (c) => {
		const data = await c.req.json();
		const parsed = MockCreateSchema.safeParse(data);
		if (!parsed.success) {
			return c.json({ error: parsed.error.message }, 400);
		}
		const { url, token, targetString, count } = parsed.data;
		const [id, secret] = token.split(":");
		const tokenGenerator = new TokenGenerator(id, secret);
		const ghost = new Ghost({ url, tokenGenerator });
		for (let i = 0; i < count; i++) {
			await ghost.createMockPost({
				title: `${targetString} ${i}`,
				text: `TEST_DATA ${targetString} ${i}`,
			});
		}
		return c.json({ success: true });
	})
	.post("/delete", async (c) => {
		const data = await c.req.json();
		const parsed = MockDeleteSchema.safeParse(data);
		if (!parsed.success) {
			return c.json({ error: parsed.error.message }, 400);
		}
		const { url, token } = parsed.data;
		const [id, secret] = token.split(":");
		const tokenGenerator = new TokenGenerator(id, secret);
		const ghost = new Ghost({ url, tokenGenerator });
		const posts = await ghost.getAllPostIds("TEST_DATA");
		if (posts.isErr()) {
			return c.json({ error: posts.error.message }, 400);
		}
		for (const postId of posts.value) {
			await ghost.deletePost(postId);
		}
	});

export default app;
