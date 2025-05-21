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
});
export type GhostPost = z.infer<typeof GhostPostSchema>;
const ghostPostFields = Object.keys(GhostPostSchema.def.shape).join(",");

export const GhostPostsResponseSchema = z.object({
	meta: GhostMetaSchema.required(),
	posts: z.array(GhostPostSchema),
});
export type GhostPostsResponse = z.infer<typeof GhostPostsResponseSchema>;

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

	async next(): Promise<GhostPost[]> {
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
