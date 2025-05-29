import { Sema } from "async-sema";
import { type Result, err, ok } from "neverthrow";
import type { Ghost } from "./ghost.ts";
import type { GhostError } from "./schemas.ts";

/**
 * The result of an update.
 */
export const UPDATE_STATUS = {
	/**
	 * Post was actually changed and sucessfully updated.
	 */
	UPDATED: "updated",

	/**
	 * Post did not actually contain the target string, and was therefore not updated.
	 */
	SKIPPED: "skipped",

	/**
	 * An error occurred while updating the post.
	 */
	ERROR: "error",
} as const;

/**
 * An enum of the possible statuses an update can have.
 */
export type UpdateStatus = (typeof UPDATE_STATUS)[keyof typeof UPDATE_STATUS];

/**
 * The Ok value returned by {@link updatePosts}. Contains a function to abort the update process, and the total number of posts that will be potentially updated.
 */
export type UpdatePostResponse = {
	abort: () => void;
	total: number;
};

/**
 * updatePosts takes a target and replacement string, a ghost client, and a status callback function. It will then
 * fetch all posts containing the target string, and update them with the replacement string, calling the status callback
 * with the post ID and the status of the update (actually `updated`, `skipped` because the target string is not actually in the post, or `error`).
 *
 * It can also be configured with an optional concurrent update limit to control how many updates can run at once.
 *
 * If needed, it also accepts a flakePercentage, defaulting to 0, which will artifially introduce errors to demonstrate error handling.
 *
 * This is primarily designed to be hooked up to the web socket server.
 *
 * It returns a promise containing a Result, which will be ok with an object containing an abort function and the total number of posts to consider for an update, or an error if there was a problem fetching the initial list of posts.
 *
 * The returned abort function can be called to stop the update process. Otherwise it will finish on it's own once all posts have been updated. A caller
 * can determine that has happened once their status callback has been called the `total` number of times.
 *
 * @param targetString
 * @param replacementString
 * @param ghost
 * @param statusCallback
 * @param concurrentUpdateLimit
 * @param flakePercentage
 * @returns A Promise containing a Result, which will either have a {@link UpdatePostResponse} or a {@link GhostError}.
 */
export async function updatePosts(
	targetString: string,
	replacementString: string,
	ghost: Ghost,
	statusCallback: (postId: string, status: UpdateStatus) => void,
	concurrentUpdateLimit = 100,
	flakePercentage = 0,
): Promise<Result<UpdatePostResponse, GhostError>> {
	let abort = false;
	const postIds = await ghost.getAllPostIds(targetString);
	if (postIds.isErr()) {
		return err(postIds.error);
	}
	console.log(
		`Updating ${postIds.value.length} posts with ${concurrentUpdateLimit} concurrent updates`,
	);
	const sema = new Sema(concurrentUpdateLimit);
	postIds.value.map(async (postId) => {
		await sema.acquire();
		try {
			if (!abort) {
				const result = await ghost.replaceTextInPost(
					postId,
					targetString,
					replacementString,
					flakePercentage,
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
