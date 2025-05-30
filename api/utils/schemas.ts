import { z } from "zod/v4";

/**
 * This file contains all the Zod schemas used in the project, as well as their inferred types.
 */

// Ghost Schemas

export const GhostSiteInfoSchema = z.object({
	site: z.object({
		title: z.string(),
		logo: z.string().nullable(),
		icon: z.string().nullable(),
		cover_image: z.string().nullable(),
		accent_color: z.string().nullable(),
		description: z.string().nullable(),
	}),
});
export type GhostSiteInfo = z.infer<typeof GhostSiteInfoSchema>;

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
export const ghostPostFields = Object.keys(GhostPostSchema.def.shape).join(",");

export const GhostPostIdOnlySchema = z.object({
	id: z.string(),
});
export type GhostPostIdOnly = z.infer<typeof GhostPostIdOnlySchema>;

export const GhostErrorSchema = z.object({
	message: z.string(),
	type: z.string(),
});
export type GhostError = z.infer<typeof GhostErrorSchema>;

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
		errors: z.array(GhostErrorSchema),
	}),
]);
export type GhostPostResponse = z.infer<typeof GhostPostResponseSchema>;

// Updater Client Schemas

export const GhostTokenSchema = z.string().regex(/^[a-z0-9]+:[a-z0-9]+$/);

export const ClientRequestSchema = z.object({
	url: z.url(),
	token: GhostTokenSchema,
	targetString: z.string().min(1),
	replacementString: z.string().min(1),
	concurrentUpdates: z.number().min(1).max(1000).optional().default(100),
	flakePercentage: z.number().min(0).max(1).optional().default(0),
});

export const ClientStatusSchema = z.object({
	total: z.number(),
	processed: z.number(),
});
export type ClientStatus = z.infer<typeof ClientStatusSchema>;

export const ClientErrorSchema = z.object({
	postId: z.string(),
});
export type ClientError = z.infer<typeof ClientErrorSchema>;

export const ClientSuccessSchema = z.object({
	total: z.number(),
	success: z.number(),
	error: z.number(),
});
export type ClientSuccess = z.infer<typeof ClientSuccessSchema>;

export const UpdateEventType = {
	STATUS: "status",
	ERROR: "error",
	SUCCESS: "success",
} as const;
export const ClientMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal(UpdateEventType.STATUS),
		data: ClientStatusSchema,
	}),
	z.object({
		type: z.literal(UpdateEventType.ERROR),
		data: ClientErrorSchema,
	}),
	z.object({
		type: z.literal(UpdateEventType.SUCCESS),
		data: ClientSuccessSchema,
	}),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Details Route Schemas
export const DetailsSchema = z.object({
	url: z.string(),
});
