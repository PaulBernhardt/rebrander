import { Hono } from "hono";
import { upgradeWebSocket } from "hono/deno";
import { UpdaterServer } from "../utils/updaterClient.ts";

/**
 * Update exposes a websocket a /ws, handled by the a new instace of the {@link UpdaterServer} class.
 */
const app = new Hono().get(
	"/ws",
	upgradeWebSocket((c) => {
		return new UpdaterServer();
	}),
);

export default app;
