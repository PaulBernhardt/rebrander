import { Sema } from "async-sema";
import { type Result, err, ok } from "neverthrow";
import type { Ghost } from "./ghost.ts";
import type { GhostError } from "./schemas.ts";

export const UPDATE_STATUS = {
	UPDATED: "updated",
	SKIPPED: "skipped",
	ERROR: "error",
} as const;

export type UpdateStatus = (typeof UPDATE_STATUS)[keyof typeof UPDATE_STATUS];

export type UpdatePostData = {
	abort: () => void;
	total: number;
};

export async function updatePosts(
	targetString: string,
	replacementString: string,
	ghost: Ghost,
	statusCallback: (postId: string, status: UpdateStatus) => void,
	rateLimit = 100,
): Promise<Result<UpdatePostData, GhostError>> {
	let abort = false;
	const postIds = await ghost.getAllPostIds(targetString);
	if (postIds.isErr()) {
		return err(postIds.error);
	}
	const sema = new Sema(rateLimit);
	postIds.value.map(async (postId) => {
		await sema.acquire();
		try {
			if (!abort) {
				const result = await ghost.replaceTextInPost(
					postId,
					targetString,
					replacementString,
				);
				if (result.isErr()) {
					statusCallback(postId, UPDATE_STATUS.ERROR);
				} else if (result.value) {
					statusCallback(postId, UPDATE_STATUS.UPDATED);
				} else {
					statusCallback(postId, UPDATE_STATUS.SKIPPED);
				}
			}
		} finally {
			sema.release();
		}
	});
	return ok({
		abort: () => {
			abort = true;
		},
		total: postIds.value.length,
	});
}
