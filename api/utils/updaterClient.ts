import { Ghost } from "./ghost.ts";
import { updatePosts } from "./postUpdater.ts";
import { safeParse } from "./safeParse.ts";
import { ClientRequestSchema } from "./schemas.ts";
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

export const UpdateEventType = {
	STATUS: "status",
	ERROR: "error",
	SUCCESS: "success",
} as const;
export type UpdateEventType =
	(typeof UpdateEventType)[keyof typeof UpdateEventType];

export type UpdateEventData = {
	[UpdateEventType.STATUS]: StatusUpdate;
	[UpdateEventType.ERROR]: {
		postId: string;
	};
	[UpdateEventType.SUCCESS]: {
		total: number;
		success: number;
		error: number;
	};
};

export type UpdateEvent<T extends UpdateEventType> = {
	type: T;
	data: UpdateEventData[T];
};

export type StatusUpdate = {
	total: number;
	processed: number;
};

export class UpdaterClient {
	static send<T extends UpdateEventType>(ws: WS, event: UpdateEvent<T>) {
		ws.send(JSON.stringify(event));
	}
	abort: () => void = () => {};

	onMessage: WebSocketEventHandler<OnMessageEvent> = async (event, ws) => {
		try {
			const payload = safeParse(event.data.toString());
			if (payload.isErr()) {
				ws.close(4400, "Invalid request, expected valid JSON");
				return;
			}
			const parsed = ClientRequestSchema.safeParse(payload.value);
			if (!parsed.success) {
				ws.close(4400, `Invalid request: ${parsed.error.message}`);
				return;
			}
			const { url, token, targetString, replacementString, concurrentUpdates } =
				parsed.data;
			const ghostClient = this.createGhostClient(url, token);
			const info = await ghostClient.getSiteInfo();
			if (info.isErr()) {
				ws.close(4400, `Unable to get site info: ${info.error.message}`);
				return;
			}

			let processed = 0;
			let errorCount = 0;
			const notificationInterval = Math.max(
				1,
				Math.round(concurrentUpdates / 100),
			);

			const abort = await updatePosts(
				targetString,
				replacementString,
				ghostClient,
				(postId, status) => {
					if (status === "error") {
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
						UpdaterClient.send(ws, {
							type: UpdateEventType.SUCCESS,
							data: { total, success: total - errorCount, error: errorCount },
						});
					}
				},
				concurrentUpdates,
			);
			if (abort.isErr()) {
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
			ws.close(1011, "Server error");
		}
	};
	onClose: WebSocketEventHandler<OnCloseEvent> = async (event, ws) => {
		this.abort();
	};
	onError: WebSocketEventHandler<BasicEvent> = async () => {};

	createGhostClient(url: string, token: string): Ghost {
		const [id, secret] = token.split(":");
		const tokenGenerator = new TokenGenerator(id, secret);
		return new Ghost({ url, tokenGenerator });
	}
}
