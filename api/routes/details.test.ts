/// <reference lib="deno.ns" />
import { expect } from "jsr:@std/expect";
import app from "./details.ts";

Deno.test("it should return a 400 error if the details are invalid", async () => {
	const response = await app.request("/", {
		method: "POST",
		body: "not a json object",
	});
	expect(response.status).toBe(400);
});

Deno.test("it should return a 400 error if the details don't match the schema", async () => {
	const response = await app.request("/", {
		method: "POST",
		body: JSON.stringify({
			other: "not a url",
		}),
	});
	expect(response.status).toBe(400);
});

Deno.test("it should return a details object if the details are valid", async () => {
	const response = await app.request("/", {
		method: "POST",
		body: JSON.stringify({
			url: "https://ghost.glitteringvoid.ca",
		}),
	});
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body).toMatchObject({
		site: {
			accent_color: "#273d84",
			cover_image:
				"https://ghost.glitteringvoid.ca/content/images/2025/03/V18RVMK1FMAMCYCWNMN0B0RVC0-5.jpg",
			description: "Thoughts, stories and ideas.",
			icon: "https://ghost.glitteringvoid.ca/content/images/2025/03/AYZMQRC6RNYEAB716W52AMW0Z0-1.jpg",
			logo: null,
			title: "The Glittering Void",
		},
	});
});

Deno.test("it should return an error if the url is not a ghost site", async () => {
	const response = await app.request("/", {
		method: "POST",
		body: JSON.stringify({
			url: "https://speed.cloudflare.com/",
		}),
	});
	expect(response.status).toBe(400);
	const body = await response.json();
	expect(body).toMatchObject({
		message:
			"Failed to get site info: SyntaxError: Unexpected end of JSON input",
	});
});
