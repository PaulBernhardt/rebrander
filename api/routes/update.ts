import { Hono } from "hono";
import { upgradeWebSocket } from "hono/deno";
import { UpdaterClient } from "../utils/updaterClient.ts";

const app = new Hono().get(
	"/ws",
	upgradeWebSocket((c) => {
		return new UpdaterClient();
	}),
);

export default app;
