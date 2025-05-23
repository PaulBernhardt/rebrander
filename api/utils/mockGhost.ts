import { type Result, err, ok } from "neverthrow";
import { Ghost, MOCK_POST_LEXICAL } from "./ghost.ts";
import type { GhostError, GhostPost, GhostSiteInfo } from "./schemas.ts";
import type { TokenGenerator } from "./tokenGenerator.ts";

export class MockGhost extends Ghost {
	private idCounter = 0;
	private posts: Map<string, GhostPost> = new Map();
	constructor(url: string, tokenGenerator: TokenGenerator) {
		super({ url, tokenGenerator });
	}

	override createMockPost({
		title,
		text,
	}: { title: string; text: string }): Promise<string> {
		const id = `${this.idCounter++}`;
		this.posts.set(id, {
			id,
			title,
			lexical: MOCK_POST_LEXICAL.replace("$", text),
			updated_at: new Date().toISOString(),
		});
		return Promise.resolve(id);
	}

	override deletePost(id: string): Promise<boolean> {
		if (!this.posts.has(id)) {
			return Promise.resolve(false);
		}
		this.posts.delete(id);
		return Promise.resolve(true);
	}

	override getPost(id: string): Promise<Result<GhostPost, GhostError>> {
		const post = this.posts.get(id);
		if (!post) {
			return Promise.resolve(
				err({ message: "Post not found", type: "PostNotFound" }),
			);
		}
		return Promise.resolve(ok(post));
	}

	override getAllPostIds(
		targetString: string,
	): Promise<Result<string[], GhostError>> {
		const ids = Array.from(this.posts.keys());
		return Promise.resolve(ok(ids));
	}

	override getSiteInfo(): Promise<Result<GhostSiteInfo, GhostError>> {
		return Promise.resolve(
			ok({
				site: {
					title: "Mock Ghost",
					logo: null,
					icon: null,
					cover_image: null,
					accent_color: null,
					description: null,
				},
			}),
		);
	}

	override updatePost(
		id: string,
		post: GhostPost,
	): Promise<Result<void, GhostError>> {
		if (!this.posts.has(id)) {
			return Promise.resolve(
				err({ message: "Post not found", type: "PostNotFound" }),
			);
		}
		this.posts.set(id, post);
		return Promise.resolve(ok(undefined));
	}

	createMockPosts(count: number, text: string): Promise<string[]> {
		const ids = [];
		for (let i = 0; i < count; i++) {
			ids.push(
				this.createMockPost({ title: `Mock Post ${i}`, text: `${text} ${i}` }),
			);
		}
		return Promise.all(ids);
	}
}
