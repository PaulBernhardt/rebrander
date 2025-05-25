import { Hono } from "hono";
import { logger } from "hono/logger";
import details from "./routes/details.ts";
import mock from "./routes/mock.ts";
import update from "./routes/update.ts";

const app = new Hono()
	.use(logger())
	.use()
	.get("/health", (c) => c.text("OK"))
	.route("/details", details)
	.route("/update", update)
	.route("/mock", mock);

console.log("Server started");

export default app;

export type ServerApi = typeof app;
