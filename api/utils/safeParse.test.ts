import { expect } from "jsr:@std/expect";
import { safeParse } from "./safeParse.ts";

Deno.test("safeParse - should parse a valid json string", () => {
	const result = safeParse(JSON.stringify({ name: "John" }));
	expect(result.isOk()).toBe(true);
	expect(result.unwrapOr(null)).toEqual({ name: "John" });
});

Deno.test("safeParse - should return an error if the json string is invalid", () => {
	const result = safeParse("invalid json");
	expect(result.isErr()).toBe(true);
});
