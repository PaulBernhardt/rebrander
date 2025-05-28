import { Ghost } from "./ghost.ts";
import { updatePosts } from "./postUpdater.ts";
import { safeParse } from "./safeParse.ts";
import {
	type ClientMessage,
	ClientRequestSchema,
	UpdateEventType,
} from "./schemas.ts";
import { TokenGenerator } from "./tokenGenerator.ts";

export type WS = {
	close: (code: number, reason: string) => void;
	send: (data: string) => void;
};

export type OnMessageEvent = BasicEvent & {
	data: { toString: () => string };
};

export type OnCloseEvent = BasicEvent & {
	code: number;
	reason: string;
	wasClean: boolean;
};

export type BasicEvent = { type: string };

export type WebSocketEventHandler<T extends BasicEvent> = (
	event: T,
	ws: WS,
) => Promise<void>;

/**
 * An Updater Server takes a WebSocket connection and handles it with the expectation it will be used for an
 * update/rebrand operation.
 *
 * This means upon connection, it expects an initial message from the client with a {@link ClientMessage} object containg
 * the configuration for the rebrand opertation. It will then use the {@link updatePosts} function to start the update process,
 * periodically sending status updates to the client. Any post that fails to update will get an error event, and when all posts have been updated,
 * a success event will be sent.
 *
 * If the connection is closed by the client, or there is some other error, an in-progress update will be aborted.
 */
export class UpdaterServer {
	static send(ws: WS, event: ClientMessage) {
		ws.send(JSON.stringify(event));
	}
	abort: () => void = () => {
		console.log("Aborting update");
	};

	onMessage: WebSocketEventHandler<OnMessageEvent> = async (event, ws) => {
		console.log("Recieved WebSocket message");
		try {
			const payload = safeParse(event.data.toString());
			if (payload.isErr()) {
				console.error("Invalid request, expected valid JSON");
				ws.close(4400, "Invalid request, expected valid JSON");
				return;
			}
			const parsed = ClientRequestSchema.safeParse(payload.value);
			if (!parsed.success) {
				console.error("Invalid request", parsed.error.message);
				ws.close(4400, `Invalid request: ${parsed.error.message}`);
				return;
			}
			const {
				url,
				token,
				targetString,
				replacementString,
				concurrentUpdates,
				flakePercentage,
			} = parsed.data;

			// If the client requests it, we will artificially fail a percentage of updates, in order to demonstrate error handling.
			if (flakePercentage > 0) {
				console.log(
					`Flake percentage is set, update will fail on ${flakePercentage * 100}% of posts`,
				);
			}
			// If we cannot fetch the site info, this is probably not a valid Ghost instance and we will close the connection.
			const ghostClient = this.createGhostClient(url, token);
			const info = await ghostClient.getSiteInfo();
			if (info.isErr()) {
				console.error("Unable to get site info", info.error);
				ws.close(4400, `Unable to get site info: ${info.error.message}`);
				return;
			}

			let processed = 0;
			let errorCount = 0;
			// Send a status update a maximum of 10 times per concurrent update. By default, this will be every 10 updates.
			const notificationInterval = Math.max(
				1,
				Math.round(concurrentUpdates / 10),
			);
			console.log(
				`Updating posts at ${url} with target string ${targetString} and replacement string ${replacementString}, with concurrent updates ${concurrentUpdates}`,
			);

			const updateResult = await updatePosts(
				targetString,
				replacementString,
				ghostClient,
				(postId, status) => {
					if (status === "error") {
						console.log("Error updating post", postId);
						errorCount++;
						UpdaterServer.send(ws, {
							type: UpdateEventType.ERROR,
							data: { postId },
						});
					}
					// TODO: We drop the `skipped` status here and don't report it to the client. Ideally in future, it should be reported
					// similarly to an error, so the user could manually review posts that were skipped because they didn't match on the case of the target string.
					processed++;
					if (processed % notificationInterval === 0) {
						UpdaterServer.send(ws, {
							type: UpdateEventType.STATUS,
							data: { total, processed },
						});
					}
					if (processed === total) {
						console.log("Sending success event", total, errorCount);
						UpdaterServer.send(ws, {
							type: UpdateEventType.SUCCESS,
							data: { total, success: total - errorCount, error: errorCount },
						});
						ws.close(1000, "Update complete");
					}
				},
				concurrentUpdates,
				flakePercentage,
			);
			if (updateResult.isErr()) {
				console.error("Unable to update posts", updateResult.error);
				ws.close(4400, `Unable to update posts: ${updateResult.error.message}`);
				return;
			}
			this.abort = updateResult.value.abort;
			const total = updateResult.value.total;
			// Send an initial status update with 0 processed so the client can display the total number of posts that may be updated.
			await UpdaterServer.send(ws, {
				type: UpdateEventType.STATUS,
				data: {
					total,
					processed,
				},
			});
		} catch (error) {
			console.error("Server error", error);
			ws.close(1011, "Server error");
		}
	};
	onClose: WebSocketEventHandler<OnCloseEvent> = async (event, ws) => {
		console.log("WebSocket closed", event.code, event.reason);
		this.abort();
	};
	onError: WebSocketEventHandler<BasicEvent> = async (event, ws) => {
		console.error("WebSocket error", event.type);
		ws.close(1011, "Server error");
		this.abort();
	};

	/**
	 * This is a helper function which you can override in a test to allow injecting custom mock ghost clients.
	 */
	createGhostClient(url: string, token: string): Ghost {
		const [id, secret] = token.split(":");
		const tokenGenerator = new TokenGenerator(id, secret);
		return new Ghost({ url, tokenGenerator });
	}
}
