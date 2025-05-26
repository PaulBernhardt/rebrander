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

export class UpdaterClient {
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

			if (flakePercentage > 0) {
				console.log(
					`Flake percentage is set, update will fail on ${flakePercentage * 100}% of posts`,
				);
			}
			const ghostClient = this.createGhostClient(url, token);
			const info = await ghostClient.getSiteInfo();
			if (info.isErr()) {
				console.error("Unable to get site info", info.error);
				ws.close(4400, `Unable to get site info: ${info.error.message}`);
				return;
			}

			let processed = 0;
			let errorCount = 0;
			const notificationInterval = Math.max(
				1,
				Math.round(concurrentUpdates / 10),
			);
			console.log(
				`Updating posts at ${url} with target string ${targetString} and replacement string ${replacementString}, with concurrent updates ${concurrentUpdates}`,
			);

			const abort = await updatePosts(
				targetString,
				replacementString,
				ghostClient,
				(postId, status) => {
					if (status === "error") {
						console.log("Error updating post", postId);
						errorCount++;
						UpdaterClient.send(ws, {
							type: UpdateEventType.ERROR,
							data: { postId },
						});
					}
					processed++;
					if (processed % notificationInterval === 0) {
						UpdaterClient.send(ws, {
							type: UpdateEventType.STATUS,
							data: { total, processed },
						});
					}
					if (processed === total) {
						console.log("Sending success event", total, errorCount);
						UpdaterClient.send(ws, {
							type: UpdateEventType.SUCCESS,
							data: { total, success: total - errorCount, error: errorCount },
						});
						ws.close(1000, "Update complete");
					}
				},
				concurrentUpdates,
				flakePercentage,
			);
			if (abort.isErr()) {
				console.error("Unable to update posts", abort.error);
				ws.close(4400, `Unable to update posts: ${abort.error.message}`);
				return;
			}
			this.abort = abort.value.abort;
			const total = abort.value.total;
			await UpdaterClient.send(ws, {
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
	};

	createGhostClient(url: string, token: string): Ghost {
		const [id, secret] = token.split(":");
		const tokenGenerator = new TokenGenerator(id, secret);
		return new Ghost({ url, tokenGenerator });
	}
}
