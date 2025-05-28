/**
 * This is the main controller for the Rebrander API server.
 *
 * It exposes a very basic health check, a details route that fetches
 * the Site Info of a potential Ghost site, and the main update route that is
 * offers a websocket connection to do the rebrand, passing messages back to the client.
 *
 * There is also a "mock" route that can be used to generate test posts in an actual Ghost site.
 *
 * The mock route is not expected to be exposed or used by the client, but it can be helpful for testing.
 */
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
// This is defined separately to not mess up the hono client type generation
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

export default server;

// API type for use with typed hono client
export type ServerApi = typeof app;
