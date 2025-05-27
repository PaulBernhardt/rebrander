import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import details from "./routes/details.ts";
import mock from "./routes/mock.ts";
import update from "./routes/update.ts";

// API routes
const app = new Hono()
	.use(logger())
	.get("/health", (c) => c.text("OK"))
	.route("/details", details)
	.route("/update", update)
	.route("/mock", mock);

// Add client app to the server
const server = app
	.use(
		"/*",
		serveStatic({
			root: "./dist",
			rewriteRequestPath: (path) => {
				if (!path.match(/\.[a-zA-Z0-9]+$/)) {
					return "/index.html";
				}
				return path;
			},
		}),
	)
	.use(
		"/assets/*",
		serveStatic({
			root: "./dist",
		}),
	);
console.log("Server started");

export default server;

// API type for use with typed hono client
export type ServerApi = typeof app;
