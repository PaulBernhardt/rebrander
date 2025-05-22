import { Hono } from "hono";
import { z } from "zod/v4";
import { Ghost } from "../utils/ghost.ts";

const DetailsSchema = z.object({
	url: z.string(),
});

const app = new Hono().post("/", async (c) => {
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

		const siteInfo = await Ghost.getSiteInfo(details.data.url);
		if (siteInfo.isErr()) {
			return c.json({ message: siteInfo.error.message }, 400);
		}
		return c.json(siteInfo.value);
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

export default app;
