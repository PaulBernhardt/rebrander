import { hc } from "hono/client";
// @ts-types="solid-js"
import { createResource, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import type { ServerApi } from "../../api/main.ts";
import {
	ClientMessageSchema,
	UpdateEventType,
} from "../../api/utils/schemas.ts";

/**
 * The possible statuses of the rebrander.
 */
export const REBRANDER_STATUS = {
	LOADING: "loading",
	RUNNING: "running",
	ERROR: "error",
	DONE: "done",
} as const;

export type RebranderStatus =
	(typeof REBRANDER_STATUS)[keyof typeof REBRANDER_STATUS];

/**
 * The result of a successful rebranding process.
 *
 * @param total - The total number of posts containing the target string.
 * @param success - The number of posts that were successfully updated.
 * @param error - The number of posts that failed to update.
 */
export type RebranderResult = {
	total: number;
	success: number;
	error: number;
};

/**
 * This function creates a rebrander object, which is used to control the rebranding
 * process. It takes configuration options, and returns a number of signals that
 * can be used to display status and know when it's complete.
 *
 * It primarily does this by initiating a websocket connection to
 * the {@link ServerApi}, sending a configuration message, and then
 * parsing the response messages to update signals.
 *
 * @param options - The options for the rebrander.
 * @returns The rebrander object.
 */
export function createRebrander(options: {
	url: string;
	apiKey: string;
	targetString: string;
	replacementString: string;
	host: string;
	client?: ReturnType<typeof hc<ServerApi>>;
	concurrentUpdates?: number;
	flakePercentage?: number;
}) {
	console.log("Creating rebrander", options);
	const client = options.client ?? hc<ServerApi>(options.host);
	const [status, setStatus] = createSignal<RebranderStatus>(
		REBRANDER_STATUS.LOADING,
	);

	// The total number of posts containing the target string, using Ghost's filter API
	// This does a case insensitive search, so not all posts will actually change.
	const [total, setTotal] = createSignal<number | null>(null);

	// Tracks how many posts have been processed by the updater
	const [processed, setProcessed] = createSignal<number>(0);

	// Tracks an array of post IDs that failed to update.
	const [failedUpdates, setFailedUpdates] = createStore<string[]>([]);

	// Tracks any error that occurs during the rebranding process.
	const [error, setError] = createSignal<string | null>(null);

	// The primary resource that actually does the work. When it resolves,
	// rebranding is complete (or failed). It will resolve with the final status
	// returned by the ServerApi, if successful.
	const [updater] = createResource<RebranderResult | null>(async () => {
		return new Promise((resolve, reject) => {
			const socket = client.update.ws.$ws();

			// If the websocket encounters an error, update the signals and reject our updater.
			socket.onerror = (event) => {
				setStatus(REBRANDER_STATUS.ERROR);
				setError("Websocket error");
				socket.close();
				reject(event);
			};
			// On open, send the configuration message to the ServerApi.
			socket.onopen = (event) => {
				setStatus(REBRANDER_STATUS.RUNNING);
				socket.send(
					JSON.stringify({
						url: options.url,
						token: options.apiKey,
						targetString: options.targetString,
						replacementString: options.replacementString,
						concurrentUpdates: options.concurrentUpdates,
						flakePercentage: options.flakePercentage ?? 0,
					}),
				);
			};
			// On close, check if it was a clean close, or an error.
			socket.onclose = ({ code, reason }) => {
				if (code === 1000) {
					setStatus(REBRANDER_STATUS.DONE);
				} else {
					setStatus(REBRANDER_STATUS.ERROR);
					setError(reason);
					reject(reason);
				}
			};
			// Wait for status updates, errors, or the final result
			socket.onmessage = (event) => {
				const data = JSON.parse(event.data);
				const parsed = ClientMessageSchema.safeParse(data);
				if (!parsed.success) {
					setError("Invalid message received from server");
					socket.close();
					return;
				}
				const message = parsed.data;
				switch (message.type) {
					case UpdateEventType.STATUS:
						setTotal(message.data.total);
						setProcessed(message.data.processed);
						break;
					case UpdateEventType.ERROR:
						setFailedUpdates((prev) => [...prev, message.data.postId]);
						break;
					case UpdateEventType.SUCCESS:
						resolve({
							total: message.data.total,
							success: message.data.success,
							error: message.data.error,
						});
						setStatus(REBRANDER_STATUS.DONE);
						break;
				}
			};
		});
	});

	return {
		status,
		updater,
		error,
		failedUpdates,
		total,
		processed,
	};
}
export type Rebrander = ReturnType<typeof createRebrander>;
