/// <reference lib="deno.ns" />
import { expect } from "jsr:@std/expect";
import {
	type LexicalTextObject,
	deserialize,
	findAndReplace,
	replaceTextInParsedLexical,
} from "./lexical.ts";

Deno.test("deserialize - Should deserialize valid lexical strings", () => {
	const lexical =
		'{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Goal Text","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
	const deserialized = deserialize(lexical);
	if (deserialized.isErr()) {
		throw new Error(deserialized.error.message);
	}
	expect(deserialized.value.root.children?.[0].children?.[0].text).toBe(
		"Goal Text",
	);
	expect(deserialized.value).toMatchObject(JSON.parse(lexical));
});

Deno.test("deserialize - Should reject if lexical is not valid json", () => {
	const lexical = "not a valid lexical string";
	const deserialized = deserialize(lexical);
	expect(deserialized.isErr()).toBe(true);
});

Deno.test("deserialize - Should reject if lexical is json but not lexical", () => {
	const lexical = '["not a valid lexical string"]';
	const deserialized = deserialize(lexical);
	expect(deserialized.isErr()).toBe(true);
});

Deno.test("replaceText - Should replace text in lexical", () => {
	const lexical: LexicalTextObject = {
		children: [
			{
				children: [{ text: "Some goal text" }],
			},
			{
				children: [
					{ text: "Some other GOAL TEXT with a different case to keep" },
				],
			},
			{
				text: "Some goal text here too. And goal text.",
			},
			{
				text: "Don't change this one",
			},
		],
		text: "More goal text",
	};
	const replaced = replaceTextInParsedLexical(lexical, "goal text", "beans");
	expect(replaced.result).toMatchObject({
		children: [
			{
				children: [{ text: "Some beans" }],
			},
			{
				children: [
					{ text: "Some other GOAL TEXT with a different case to keep" },
				],
			},
			{
				text: "Some beans here too. And beans.",
			},
			{
				text: "Don't change this one",
			},
		],
		text: "More beans",
	});
	expect(replaced.replacementsMade).toBe(true);
});

Deno.test("replaceText - Should not replace text if it's not present", () => {
	const lexical: LexicalTextObject = {
		children: [{ children: [{ text: "Some text" }] }],
		text: "More text",
	};
	const replaced = replaceTextInParsedLexical(lexical, "goal text", "beans");
	expect(replaced.result).toMatchObject(lexical);
	expect(replaced.replacementsMade).toBe(false);
});

Deno.test("findAndReplace - Should replace text in lexical", () => {
	const lexical =
		'{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Here is the target text to replace","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
	const replaced = findAndReplace(lexical, "target text", "stuff");
	if (replaced.isErr()) {
		throw new Error(replaced.error.message);
	}
	expect(replaced.value.string).not.toMatch(
		/Here is the target text to replace/,
	);
	expect(replaced.value.string).toMatch(/Here is the stuff to replace/);
	expect(replaced.value.replacementsMade).toBe(true);
	const replaced2 = findAndReplace(
		replaced.value.string,
		"stuff",
		"target text",
	);
	if (replaced2.isErr()) {
		throw new Error(replaced2.error.message);
	}
	expect(replaced2.value.string).not.toMatch(/Here is the stuff to replace/);
	expect(replaced2.value.string).toMatch(/Here is the target text to replace/);
	expect(replaced2.value.replacementsMade).toBe(true);

	// We can't do this earlier because the order of keys is changed, but
	// putting the original text back will produce a string that parsed back to the original
	expect(JSON.parse(replaced2.value.string)).toMatchObject(JSON.parse(lexical));
});

Deno.test("findAndReplace - Should not replace text if it's not present", () => {
	const lexical =
		'{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Here is the target text to replace","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
	const replaced = findAndReplace(lexical, "not present", "stuff");
	if (replaced.isErr()) {
		throw new Error(replaced.error.message);
	}
	expect(replaced.value.string).toMatch(/Here is the target text to replace/);
	expect(replaced.value.replacementsMade).toBe(false);
});
