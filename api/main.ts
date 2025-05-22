import { Hono } from "hono";
import { logger } from "hono/logger";
import details from "./routes/details.ts";
import socket from "./routes/update.ts";

const app = new Hono()
	.use(logger())
	.get("/health", (c) => c.text("OK"))
	.route("/details", details)
	.route("/update", socket);
// app.get(
// 	"/ws",
// 	upgradeWebSocket((c) => {
// 		console.log("WS");
// 		return {
// 			onOpen(event, ws) {
// 				console.log("Connection opened");
// 				ws.send("Hello from server!");
// 			},
// 			onMessage(event, ws) {
// 				console.log(`Message from client: ${event.data}`);
// 				ws.send(`You said: ${event.data}`);
// 			},
// 			onClose(event, ws) {
// 				console.log("Connection closed");
// 				ws.send("Connection closed");
// 			},
// 		};
// 	}),
// );

console.log("Server started");

export default app;
