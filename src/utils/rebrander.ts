import { hc } from "hono/client";
// @ts-types="solid-js"
import { createResource, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import type { ServerApi } from "../../api/main.ts";
import {
	ClientMessageSchema,
	UpdateEventType,
} from "../../api/utils/schemas.ts";

export const REBRANDER_STATUS = {
	LOADING: "loading",
	RUNNING: "running",
	ERROR: "error",
	DONE: "done",
} as const;

export type RebranderStatus =
	(typeof REBRANDER_STATUS)[keyof typeof REBRANDER_STATUS];

export type RebranderResult = {
	total: number;
	success: number;
	error: number;
};

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

	const [total, setTotal] = createSignal<number | null>(null);
	const [processed, setProcessed] = createSignal<number>(0);
	const [failedUpdates, setFailedUpdates] = createStore<string[]>([]);
	const [error, setError] = createSignal<string | null>(null);
	const [updater] = createResource<RebranderResult | null>(async () => {
		return new Promise((resolve, reject) => {
			const socket = client.update.ws.$ws();

			socket.onerror = (event) => {
				setStatus(REBRANDER_STATUS.ERROR);
				setError("Websocket error");
				socket.close();
				reject(event);
			};
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
			socket.onclose = ({ code, reason }) => {
				if (code === 1000) {
					setStatus(REBRANDER_STATUS.DONE);
				} else {
					setStatus(REBRANDER_STATUS.ERROR);
					setError(reason);
					reject(reason);
				}
			};
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
