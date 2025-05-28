import { Hono } from "hono";
import { cors } from "hono/cors";
import { Ghost } from "../utils/ghost.ts";
import { DetailsSchema } from "../utils/schemas.ts";

/**
 * Details exposes a route that takes a JSON object containg a `url` property,
 * and returns either the Ghost Site Info, if it's a valid Ghost site, or an error message.
 *
 * It takes no api keys, since the info route is not protected in Ghost.
 *
 * The actual work is done by the {@link Ghost} client, which has a static `siteInfo` method.
 * This route just controls recieving the request, and responding with either the info or an error.
 */
const app = new Hono().use(cors()).post("/", async (c) => {
	try {
		const body = await c.req.json();
		const details = DetailsSchema.safeParse(body);
		if (!details.success) {
			console.log("Invalid request", details.error);
			return c.json(
				{
					message: "Invalid details",
				},
				400,
			);
		}

		const siteInfo = await Ghost.getSiteInfo(details.data.url);
		if (siteInfo.isErr()) {
			console.log("Error getting site info", siteInfo.error);
			return c.json({ message: siteInfo.error.message }, 400);
		}
		return c.json(siteInfo.value);
	} catch (error) {
		console.log(`Error parsing details: ${error}`);
		return c.json(
			{
				message:
					"Error parsing details, must be a JSON object with a url property",
			},
			400,
		);
	}
});

export default app;
