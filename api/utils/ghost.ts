import { type Result, err, ok } from "neverthrow";
import { escapeString } from "./escapeString.ts";
import { findAndReplace } from "./lexical.ts";
import {
	type GhostError,
	type GhostPagination,
	type GhostPost,
	type GhostPostIdOnly,
	GhostPostResponseSchema,
	GhostPostsResponseSchema,
	type GhostSiteInfo,
	GhostSiteInfoSchema,
	ghostPostFields,
} from "./schemas.ts";
import type { TokenGenerator } from "./tokenGenerator.ts";

export const MOCK_POST_LEXICAL =
	'{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"$","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

const TokenGeneratorNotSetError = {
	message: "Token generator is not set",
	type: "TokenGeneratorNotSetError",
};

export class Ghost {
	url: string;
	tokenGenerator: TokenGenerator;

	constructor({
		url,
		tokenGenerator,
	}: { url: string; tokenGenerator: TokenGenerator }) {
		this.url = url;
		this.tokenGenerator = tokenGenerator;
	}
	static async getSiteInfo(
		url: string,
	): Promise<Result<GhostSiteInfo, GhostError>> {
		try {
			const response = await fetch(`${url}/ghost/api/admin/site`);
			const data = await response.json();
			const parsed = GhostSiteInfoSchema.safeParse(data);
			if (!parsed.success) {
				return err({
					message: `Failed to parse site info: ${parsed.error}`,
					type: "GhostSiteInfoError",
				});
			}
			return ok(parsed.data);
		} catch (error) {
			return err({
				message: `Failed to get site info: ${error}`,
				type: "GhostSiteInfoError",
			});
		}
	}

	async getSiteInfo(): Promise<Result<GhostSiteInfo, GhostError>> {
		return Ghost.getSiteInfo(this.url);
	}

	getPostFetcher({
		page = 0,
		limit = 25,
		targetString,
	}: {
		page?: number;
		limit?: number;
		targetString?: string;
	} = {}): PostFetcher {
		return new PostFetcher(
			this.url,
			this.tokenGenerator,
			{ page, limit },
			targetString,
		);
	}

	async getPost(id: string): Promise<Result<GhostPost, GhostError>> {
		const response = await fetch(
			`${this.url}/ghost/api/admin/posts/${id}?fields=${ghostPostFields}`,
			{
				headers: {
					Authorization: `Ghost ${this.tokenGenerator.get()}`,
				},
			},
		);
		if (!response.ok) {
			response.body?.cancel();
			return err({
				message: `Failed to fetch post: ${response.status}`,
				type: "GhostPostError",
			});
		}
		const data = await response.json();
		const parsed = GhostPostResponseSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`Failed to fetch post: ${parsed.error}`);
		}
		if ("posts" in parsed.data) {
			return ok(parsed.data.posts[0]);
		}
		return err(parsed.data.errors[0]);
	}

	async updatePost(
		id: string,
		post: GhostPost,
	): Promise<Result<void, GhostError>> {
		try {
			const response = await fetch(`${this.url}/ghost/api/admin/posts/${id}/`, {
				method: "PUT",
				body: JSON.stringify({
					posts: [post],
				}),
				headers: {
					Authorization: `Ghost ${this.tokenGenerator.get()}`,
					"Content-Type": "application/json",
				},
			});
			if (response.ok) {
				response.body?.cancel();
				return ok(undefined);
			}
			const data = await response.json();
			return err({
				message: `Failed to update post: ${JSON.stringify(data)}`,
				type: "GhostPostError",
			});
		} catch (e) {
			return err({
				message: `Failed to update post: ${e}`,
				type: "UnknownError",
			});
		}
	}

	async createMockPost({
		title,
		text,
	}: { title: string; text: string }): Promise<string> {
		const response = await fetch(`${this.url}/ghost/api/admin/posts/`, {
			method: "POST",
			body: JSON.stringify({
				posts: [
					{
						title,
						lexical: MOCK_POST_LEXICAL.replace("$", `MOCK POST: ${text}`),
					},
				],
			}),
			headers: {
				Authorization: `Ghost ${this.tokenGenerator.get()}`,
				"Content-Type": "application/json",
			},
		});
		const data = await response.json();
		return data.posts[0].id;
	}

	async deletePost(id: string): Promise<boolean> {
		const response = await fetch(`${this.url}/ghost/api/admin/posts/${id}`, {
			method: "DELETE",
			headers: {
				Authorization: `Ghost ${this.tokenGenerator.get()}`,
			},
		});
		return response.ok;
	}

	async replaceTextInPost(
		id: string,
		target: string,
		replacement: string,
		flakePercentage: number,
	): Promise<Result<boolean, GhostError>> {
		const post = await this.getPost(id);
		if (post.isErr()) {
			return err(post.error);
		}
		const replaceResult = findAndReplace(
			post.value.lexical,
			target,
			replacement,
		);
		if (replaceResult.isErr()) {
			return err(replaceResult.error);
		}
		if (!replaceResult.value.replacementsMade) {
			return ok(false);
		}
		// You can set a flake percentage to test error handling
		if (Math.random() < flakePercentage) {
			return err({
				message: "Test error",
				type: "TestError",
			});
		}
		const updateResult = await this.updatePost(id, {
			...post.value,
			lexical: replaceResult.value.string,
		});
		if (updateResult.isErr()) {
			return err(updateResult.error);
		}
		return ok(true);
	}

	async getAllPostIds(
		targetString: string,
	): Promise<Result<string[], GhostError>> {
		const fetcher = this.getPostFetcher({
			targetString,
		});

		const postIds: string[] = [];

		while (fetcher.hasNext) {
			const posts = await fetcher.next();
			postIds.push(...posts.map((post) => post.id));
		}
		return ok(postIds);
	}
}

/**
 * A paginated collection of posts.
 */
export class PostFetcher {
	constructor(
		private readonly url: string,
		private readonly tokenGenerator: TokenGenerator,
		private pagination: GhostPagination,
		private readonly targetString?: string,
	) {}

	async next(): Promise<GhostPostIdOnly[]> {
		if (!this.hasNext) {
			return [];
		}
		const response = await fetch(
			PostFetcher.constructUrl({
				baseUrl: this.url,
				pagination: this.pagination,
				targetString: this.targetString,
				fields: ghostPostFields,
			}),
			{
				headers: {
					Authorization: `Ghost ${this.tokenGenerator.get()}`,
				},
			},
		);
		const data = await response.json();
		if (data.errors) {
			console.error(data);
			throw new Error(
				`Failed to fetch posts: ${data.errors?.[0]?.message ?? "Unknown error"}`,
			);
		}
		const parsed = GhostPostsResponseSchema.safeParse(data);
		if (!parsed.success) {
			console.error(data);
			throw new Error(`Failed to parse posts: ${parsed.error.message}`);
		}
		this.pagination = parsed.data.meta.pagination;
		return parsed.data.posts;
	}

	get hasNext(): boolean {
		return (
			this.pagination.page !== this.pagination.pages ||
			this.pagination.page === undefined ||
			this.pagination.pages === undefined
		);
	}

	get total(): number {
		return this.pagination.total ?? 0;
	}

	static constructUrl({
		baseUrl,
		pagination,
		targetString,
		fields,
	}: {
		baseUrl: string;
		pagination: GhostPagination;
		targetString?: string;
		fields: string;
	}) {
		const url = new URL(`${baseUrl}/ghost/api/admin/posts`);
		url.searchParams.set("page", pagination.next?.toString() ?? "0");
		url.searchParams.set("limit", pagination.limit.toString());
		url.searchParams.set("fields", fields);
		if (targetString) {
			url.searchParams.set(
				"filter",
				`lexical:~'${escapeString(targetString)}'`,
			);
		}
		return url.toString();
	}
}
