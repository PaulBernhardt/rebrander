import { describe, expect, it } from "vitest";
import { endUrlWithSlash } from "./endUrlWithSlash.ts";

describe("endUrlWithSlash", () => {
	it("should add a slash to the end of the url if it doesn't have one", () => {
		expect(endUrlWithSlash("https://example.com")).toBe("https://example.com/");
	});
	it("should not add a slash to the end of the url if it already has one", () => {
		expect(endUrlWithSlash("https://example.com/")).toBe(
			"https://example.com/",
		);
	});
});
