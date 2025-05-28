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

/**
 * A client for the Ghost Admin API.
 *
 * It requires a URL of a Ghost instance, and a {@link TokenGenerator} to create signed JWTs for the admin API.
 *
 * It then offers methods to read, update and delete posts, as well as a function to make a "mock" post that has a specific string.
 *
 * The Ghost class also offers a special `replaceTextInPost` method that that can be used
 * to replace one string with another in a post.
 *
 * Note that most methods return a neverthrow Result object, which is a technique to leverage the type system to better error handling.
 * Functions catch their own errors, and return a Result containing some well defined error if there was one, otherwise returning a Result containg the value.
 * Result has a few functions such as `isOk` and `isErr` that can be used to check and narrow the type of result, as well as
 * convenience functions such as `unwrapOr` to get either the value or some default if there was an error.
 *
 * @see https://github.com/supermacro/neverthrow
 */
export class Ghost {
	url: string;
	tokenGenerator: TokenGenerator;

	/**
	 * Constructs a new Ghost client, which can be used to interact with a Ghost instance at the given URL, assuming
	 * the tokenGenertor can create valid JWTs for the admin API.
	 * @param url - The URL of the Ghost instance.
	 * @param tokenGenerator - A {@link TokenGenerator} to create signed JWTs for the admin API.
	 */
	constructor({
		url,
		tokenGenerator,
	}: { url: string; tokenGenerator: TokenGenerator }) {
		this.url = url;
		this.tokenGenerator = tokenGenerator;
	}

	/**
	 * Fetches the site info of a Ghost instance at the given URL.
	 *
	 * This contains the name, description, and hopefully some image.
	 *
	 * Note this is a static method, since it doesn't require authentication.
	 *
	 * @param url - The URL of the Ghost instance.
	 * @returns A promise containing a result containing the site info of the Ghost instance, or an error if there was some problem.
	 */
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

	/**
	 * A convenience method that just calls the static `getSiteInfo` method with the url on the class instance
	 * @returns A promise containg a Result, which either has the site info or a GhostError.
	 */
	async getSiteInfo(): Promise<Result<GhostSiteInfo, GhostError>> {
		return Ghost.getSiteInfo(this.url);
	}

	/**
	 * Creates a new {@link PostFetcher} instance, which fetches the ID of all post containg a particular string
	 * in their body (according the the Ghost Content API Filter syntax, which does a case insensitive search).
	 *
	 * This is primarly an internal helper method, designed to automatically handle pagination.
	 *
	 * All params other than `targetString` are optional, and will default to the values shown.
	 * @param page - The page number to fetch.
	 * @param limit - The number of posts to fetch per page.
	 * @param targetString - A string to filter posts by.
	 * @returns A new {@link PostFetcher} instance.
	 */
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

	/**
	 * Fetches a single post by ID. It will only contain the properties specified on the {@link GhostPostSchema},
	 * which is id, title, updated_at, and lexical (which is the post body in lexical format).
	 * @param id The post ID to fetch.
	 * @returns A Result containing a {@link GhostPost} if the post is found, or a {@link GhostError} if there is some error (including the post not being found)
	 */
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
		// Return the first error
		return err(parsed.data.errors[0]);
	}

	/**
	 * Updates a Ghost Post by ID. Technically will update ANY property of the post, but we
	 * only try to use it with the results of the {@link getPost} method, which only has the
	 * properties specified on the {@link GhostPostSchema}. Even then, the Rebrander
	 * app only tries to manipulate the lexical property.
	 *
	 * This function relies on the Ghost API to validate and reject any invalid payloads.
	 *
	 * @param id The ID of the post to update.
	 * @param post The post to update.
	 * @returns A promise containing a Result, which is ok if the post was updated successfully, or an error if there was some problem.
	 */
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

	/**
	 * Creates a post for testing purposes. It will have the title supplied, and a simple body containing, among other things, the supplied text.
	 *
	 * See {@link MOCK_POST_LEXICAL} for the body of the post.
	 *
	 * Note this is just for testing and DOES NOT return a Result. It may throw on bad configurations.
	 *
	 * @param title The title of the post.
	 * @param text Text to be inserted into the mock post and submitted
	 * @returns A promise containing the ID of the created post.
	 */
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

	/**
	 * Deletes a post by ID.
	 *
	 * Note this is really just a test function for deleting mock posts. It DOES NOT return a Result, and may throw on bad options.
	 *
	 * @param id The ID of the post to delete.
	 * @returns A promise containing a boolean, which is true if the post was deleted successfully, or false if there was some problem.
	 */
	async deletePost(id: string): Promise<boolean> {
		const response = await fetch(`${this.url}/ghost/api/admin/posts/${id}`, {
			method: "DELETE",
			headers: {
				Authorization: `Ghost ${this.tokenGenerator.get()}`,
			},
		});
		return response.ok;
	}

	/**
	 * Takes the ID of a Ghost post, fetches it, finds all instances of the `target` string and replaces it with the `replacement` string.
	 * It then updates the post, returning a Result containg either a boolean indicating whether any replacements were made, or a GhostError.
	 *
	 * This is designed to be used with the results of `getAllPostIds`, which takes a (hopefully identical) target string and uses the
	 * Ghost Content API filter to find all posts containing the target string. Since that is case insensitive, but our replacement isn't,
	 * calling `replaceTextInPost` with the same target string MAY NOT result in an actual replacement, hence the boolean return value.
	 *
	 * There is also a SECRET `flakePercentage` parameter that can be used to set the probability of an error "occuring" to demonstrate error
	 * handling behaviour in the frontend. It is 0 by default, and should not be used if actually performing a Rebrand.
	 *
	 * @param id - Ghost Post ID
	 * @param target - The string to replace
	 * @param replacement - The string to replace the target with
	 * @param flakePercentage - 0 by default, the probibility that an update will magically fail.
	 * @returns A Promise containing a Result, which will be true or false if an actual replacement occurred, or a GhostError if there was a problem
	 */
	async replaceTextInPost(
		id: string,
		target: string,
		replacement: string,
		flakePercentage = 0,
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
		// Artificially introduce an error to allow demonstration of error handling
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

	/**
	 * Uses the {@link PostFetcher} to find all posts containing bodies with the target string, and returns their IDs.
	 *
	 * This uses the Ghost Content API filter, which seems to do a case insensitive search.
	 * @param targetString - The string to search for in the post bodies.
	 * @returns A Promise containing a Result, which will be ok with an array of post IDs if successful, or a GhostError if there was a problem.
	 */
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
 * An internal helper class that to help find all posts containing a particular string. It is aware
 * of the Ghost pagination system, and provides a simple interface to iterate over all pages.
 *
 * Note that if posts are changing while you are iterating, the total number of posts may appear to change.
 *
 * Since this uses the Ghost Content API filter to find posts, it is NOT safe to fetch a page, then update all posts
 * in that page, then fetch another. You should fetch ALL IDs at once, THEN update them in another pass.
 */
export class PostFetcher {
	/**
	 * Constructs a new PostFetcher, which will fetch posts from the Ghost instance at the given URL.
	 * @param url - The URL of the Ghost instance.
	 * @param tokenGenerator - A {@link TokenGenerator} to create signed JWTs for the admin API.
	 * @param pagination - The page to start with. Normally page 0 with a limit of 25.
	 * @param targetString - The string to search for in the post bodies.
	 */
	constructor(
		private readonly url: string,
		private readonly tokenGenerator: TokenGenerator,
		private pagination: GhostPagination,
		private readonly targetString?: string,
	) {}

	/**
	 * Fetches the next page of posts, returning an array.
	 * If there are no more pages, it will return an empty array.
	 *
	 * Use the {@link hasNext} property to check if there are more pages.
	 *
	 * Note this does NOT return a result, just a promise.
	 *
	 * @returns A Promise containing an array of {@link GhostPostIdOnly} objects, which contain the ID of the post.
	 */
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

	/**
	 * Looks at the current pagination object to see if there are more pages to fetch.
	 *
	 * Presumably, if you go through the pages as new posts are being added, haveNext could end
	 * up being true even if you have already fetched the original total number of posts.
	 *
	 * @returns True if there are more pages to fetch, false otherwise.
	 */
	get hasNext(): boolean {
		return (
			this.pagination.page !== this.pagination.pages ||
			this.pagination.page === undefined ||
			this.pagination.pages === undefined
		);
	}

	/**
	 * Returns the total number of posts that match the target string, according to the current pagination object.
	 *
	 * This pagination object is updated every time `next` is called, so if posts are being updated between next calls,
	 * the total may change.
	 *
	 * @returns The total number of posts that match the target string.
	 */
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
