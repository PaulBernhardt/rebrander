/// <reference lib="deno.ns" />
import { expect } from "jsr:@std/expect";
import { escapeString } from "./escapeString.ts";

Deno.test("escapeString", () => {
	expect(escapeString("Johnson's News & Co")).toBe("Johnson\\'s News & Co");
	expect(escapeString(`Johnson's "Fresh News"`)).toBe(
		`Johnson\\'s \\"Fresh News\\"`,
	);
});
