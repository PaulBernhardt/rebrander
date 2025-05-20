import { z } from "zod/v4";
import type { TokenGenerator } from "./tokenGenerator.ts";

export type GhostSiteInfo = {
	site: {
		title: string;
		icon: string | null;
		cover_image: string | null;
		accent_color: string | null;
		description: string | null;
	};
};

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

	async getPostFetcher(): Promise<PostFetcher | null> {
		if (!this.tokenGenerator) {
			return null;
		}
		return new PostFetcher(this.url, this.tokenGenerator, {
			page: 1,
			limit: 1,
		});
	}
}

export const GhostPaginationSchema = z.object({
	page: z.number(),
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
});
export type GhostPost = z.infer<typeof GhostPostSchema>;

export const GhostPostsResponseSchema = z.object({
	meta: GhostMetaSchema.required(),
	posts: z.array(GhostPostSchema),
});
export type GhostPostsResponse = z.infer<typeof GhostPostsResponseSchema>;

/**
 * A paginated collection of posts.
 */
export class PostFetcher {
	// posts: unknown[];

	constructor(
		private readonly url: string,
		private readonly tokenGenerator: TokenGenerator,
		private pagination: GhostPagination,
	) {}

	async next(): Promise<GhostPost[]> {
		const response = await fetch(
			`${this.url}/ghost/api/admin/posts?page=${this.pagination.page}&limit=${this.pagination.limit}&fields=title,lexical`,
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

	hasNext(): boolean {
		return false;
	}
}
