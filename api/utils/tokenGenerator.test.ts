/// <reference lib="deno.ns" />
import { expect } from "jsr:@std/expect";
import { FakeTime } from "jsr:@std/testing/time";
import { TokenGenerator } from "../utils/tokenGenerator.ts";

Deno.test("it should get a token", () => {
	const mockedTime = new FakeTime("2025-01-01T00:00:00.000Z");

	const generator = new TokenGenerator("a", "b");
	expect(generator.get()).toBeDefined();
	const token = generator.get();
	expect(typeof token).toBe("string");
	expect(token).toBe(
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImEifQ.eyJpYXQiOjE3MzU2ODk2MDAsImV4cCI6MTczNTY4OTkwMCwiYXVkIjoiL2FkbWluLyJ9.PA9ZrPE_ajyuMfb86Xl6bTt5svYRxHesH1kr3X252Kk",
	);

	// Different keys are different tokens
	const generator2 = new TokenGenerator("x", "y");
	const token2 = generator2.get();
	expect(token2).toBeDefined();
	expect(token2).not.toBe(token);

	const token3 = generator.get();
	expect(token3).toBe(token);

	// Use same token for 4 minutes
	mockedTime.tick(1000 * 60 * 4 - 10);
	const token4 = generator.get();
	expect(token4).toBe(token);

	// Fetch new, non-expired token
	mockedTime.tick(11);
	const token5 = generator.get();
	expect(token5).not.toBe(token);
});
