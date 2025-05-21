import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";
import { findAndReplace } from "./lexical.ts";
import type { TokenGenerator } from "./tokenGenerator.ts";
const MOCK_POST_LEXICAL =
	'{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"$","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

export type GhostSiteInfo = {
	site: {
		title: string;
		icon: string | null;
		cover_image: string | null;
		accent_color: string | null;
		description: string | null;
	};
};

export const GhostPaginationSchema = z.object({
	page: z.number().optional(),
	limit: z.number(),
	pages: z.number().optional(),
	total: z.number().optional(),
	next: z.nullable(z.number()).optional(),
	prev: z.nullable(z.number()).optional(),
});
export type GhostPagination = z.infer<typeof GhostPaginationSchema>;

export const GhostMetaSchema = z.object({
	pagination: GhostPaginationSchema.required(),
});
export type GhostMeta = z.infer<typeof GhostMetaSchema>;

export const GhostPostSchema = z.object({
	id: z.string(),
	lexical: z.string(),
	title: z.string(),
	updated_at: z.string(),
});
export type GhostPost = z.infer<typeof GhostPostSchema>;
const ghostPostFields = Object.keys(GhostPostSchema.def.shape).join(",");

export const GhostPostIdOnlySchema = z.object({
	id: z.string(),
	url: z.string(),
});
export type GhostPostIdOnly = z.infer<typeof GhostPostIdOnlySchema>;

export const GhostPostErrorSchema = z.object({
	message: z.string(),
	type: z.string(),
});
export type GhostPostError = z.infer<typeof GhostPostErrorSchema>;

const TokenGeneratorNotSetError = {
	message: "Token generator is not set",
	type: "TokenGeneratorNotSetError",
};

export const GhostPostsResponseSchema = z.object({
	meta: GhostMetaSchema.required(),
	posts: z.array(GhostPostIdOnlySchema),
});
export type GhostPostsResponse = z.infer<typeof GhostPostsResponseSchema>;

export const GhostPostResponseSchema = z.union([
	z.object({
		posts: z.array(GhostPostSchema).length(1),
	}),
	z.object({
		errors: z.array(GhostPostErrorSchema),
	}),
]);
export type GhostPostResponse = z.infer<typeof GhostPostResponseSchema>;

export class Ghost {
	url: string;
	tokenGenerator?: TokenGenerator;

	constructor({
		url,
		tokenGenerator,
	}: { url: string; tokenGenerator?: TokenGenerator }) {
		this.url = url;
		this.tokenGenerator = tokenGenerator;
	}

	async getSiteInfo(): Promise<GhostSiteInfo> {
		const response = await fetch(`${this.url}/ghost/api/admin/site`);
		const data = await response.json();
		return data;
	}

	getPostFetcher({
		page = 0,
		limit = 25,
		targetString,
	}: {
		page?: number;
		limit?: number;
		targetString?: string;
	} = {}): Result<PostFetcher, typeof TokenGeneratorNotSetError> {
		if (!this.tokenGenerator) {
			return err(TokenGeneratorNotSetError);
		}
		return ok(
			new PostFetcher(
				this.url,
				this.tokenGenerator,
				{ page, limit },
				targetString,
			),
		);
	}

	async getPost(id: string): Promise<Result<GhostPost, GhostPostError>> {
		if (!this.tokenGenerator) {
			return err(TokenGeneratorNotSetError);
		}
		const response = await fetch(
			`${this.url}/ghost/api/admin/posts/${id}?fields=${ghostPostFields}`,
			{
				headers: {
					Authorization: `Ghost ${this.tokenGenerator.get()}`,
				},
			},
		);
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

	async updatePost(id: string, post: GhostPost): Promise<number> {
		if (!this.tokenGenerator) {
			throw new Error("Token generator is not set");
		}

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
			return response.status;
		}
		const data = await response.json();
		throw new Error(`Failed to update post: ${JSON.stringify(data)}`);
	}

	async createMockPost({
		title,
		text,
	}: { title: string; text: string }): Promise<string> {
		if (!this.tokenGenerator) {
			throw new Error("Token generator is not set");
		}
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

	async deletePost(id: string): Promise<number> {
		if (!this.tokenGenerator) {
			throw new Error("Token generator is not set");
		}
		const response = await fetch(`${this.url}/ghost/api/admin/posts/${id}`, {
			method: "DELETE",
			headers: {
				Authorization: `Ghost ${this.tokenGenerator.get()}`,
			},
		});
		return response.status;
	}

	async replaceTextInPost(
		id: string,
		target: string,
		replacement: string,
	): Promise<Result<boolean, GhostPostError>> {
		const post = await this.getPost(id);
		if (post.isErr()) {
			return err(post.error);
		}
		const result = findAndReplace(post.value.lexical, target, replacement);
		if (result.isErr()) {
			return err(result.error);
		}
		if (!result.value.replacementsMade) {
			return ok(false);
		}
		// TODO: Make this return a result
		const status = await this.updatePost(id, {
			...post.value,
			lexical: result.value.result,
		});
		if (status !== 200) {
			return err({
				message: `Failed to update post: ${status}`,
				type: "GhostPostError",
			});
		}
		return ok(true);
	}

	async getAllPostIds(
		targetString: string,
	): Promise<Result<string[], GhostPostError>> {
		const fetcher = this.getPostFetcher({
			targetString,
		});
		if (fetcher.isErr()) {
			return err(fetcher.error);
		}
		const postIds: string[] = [];

		while (fetcher.value.hasNext) {
			const posts = await fetcher.value.next();
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
		const parsed = GhostPostsResponseSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`Failed to parse posts: ${parsed.error}`);
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
			url.searchParams.set("filter", `lexical:~'${targetString}'`);
		}
		return url.toString();
	}
}
