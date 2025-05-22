import { Hono } from "hono";
import { upgradeWebSocket } from "hono/deno";
import { z } from "zod/v4";

const ClientRequestSchema = z.object({
	url: z.url(),
	token: z.string().regex(/^[a-z0-9]+:[a-z0-9]+$/),
});

const app = new Hono().get(
	"/ws",
	upgradeWebSocket((c) => {
		//const abortSignal: (() => void) | null = null;
		return {
			onMessage(event, ws) {
				try {
					const data = ClientRequestSchema.parse(
						JSON.parse(event.data.toString()),
					);
				} catch (error) {
					ws.close(4400, "Invalid request, expected a valid url and token");
				}
			},
			// onClose(event, ws) {
			// 	if (abortSignal !== null) {
			// 		abortSignal();
			// 	}
		};
	}),
);

export default app;
