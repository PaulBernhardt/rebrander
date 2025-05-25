import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import details from "./routes/details.ts";
import mock from "./routes/mock.ts";
import update from "./routes/update.ts";

const app = new Hono()
	.use(logger())
	.use(cors())
	.get("/health", (c) => c.text("OK"))
	.route("/details", details)
	.route("/update", update)
	.route("/mock", mock);

console.log("Server started");

export default app;

export type ServerApi = typeof app;
