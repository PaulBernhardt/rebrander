import { Hono } from "hono";
import { upgradeWebSocket } from "hono/deno";
import { z } from "zod";
import { Ghost } from "./utils/ghost.ts";

const DetailsSchema = z.object({
	url: z.string(),
});

const app = new Hono();

app.get("/", (c) => c.text("Hello World"));

app.post("/details", async (c) => {
	try {
		const body = await c.req.json();
		const details = DetailsSchema.safeParse(body);
		if (!details.success) {
			return c.json(
				{
					message: "Invalid details",
				},
				400,
			);
		}
		const ghost = new Ghost({
			url: details.data.url,
		});
		const siteInfo = await ghost.getSiteInfo();
		return c.json({
			siteInfo,
		});
	} catch (error) {
		console.error(`Error parsing details: ${error}`);
		return c.json(
			{
				message:
					"Error parsing details, must be a JSON object with a url property",
			},
			400,
		);
	}
});

app.get(
	"/ws",
	upgradeWebSocket((c) => {
		console.log("WS");
		return {
			onOpen(event, ws) {
				console.log("Connection opened");
				ws.send("Hello from server!");
			},
			onMessage(event, ws) {
				console.log(`Message from client: ${event.data}`);
				ws.send(`You said: ${event.data}`);
			},
			onClose(event, ws) {
				console.log("Connection closed");
				ws.send("Connection closed");
			},
		};
	}),
);

console.log("Server started");

export default app;
