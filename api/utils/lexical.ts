import { type Result, err, ok } from "neverthrow";
import { z } from "zod/v4";

type ParseError = {
	message: string;
	type: "ParseError";
};

export const LexicalTextObjectSchema = z.looseObject({
	text: z.string().optional(),
	get children() {
		return z.array(LexicalTextObjectSchema).optional();
	},
});
export type LexicalTextObject = z.infer<typeof LexicalTextObjectSchema>;

export const LexicalObjectSchema = z.object({
	root: LexicalTextObjectSchema,
});

export type LexicalObject = z.infer<typeof LexicalObjectSchema>;

/**
 * Deserializes a lexical string into a LexicalObject. Ensures the string is valid JSON and matches the LexicalObjectSchema,
 * which is a very loose schema containing a root object with optional text and children (which are also objets with optional text and children).
 *
 * @param lexical - The lexical string to deserialize
 * @returns A Result containing the deserialized LexicalObject or a ParseError
 */
export function deserialize(
	lexical: string,
): Result<LexicalObject, ParseError> {
	try {
		const jsonParsed = JSON.parse(lexical);
		const result = LexicalObjectSchema.safeParse(jsonParsed);
		if (!result.success) {
			return err({
				message: result.error.message,
				type: "ParseError",
			});
		}
		return ok(result.data);
	} catch (error: unknown) {
		return err({
			message:
				error instanceof Error ? error.message : "Could not parse string",
			type: "ParseError",
		});
	}
}

/**
 * Takes a LexicalTextObject and replaces all instances of the target string with the replacement string, recursively.
 *
 * @param lexical - The LexicalTextObject to replace text in
 * @param target - The string to search for
 * @param replacement - The string to replace the target string with
 * @returns A new LexicalTextObject with the text replaced
 */
export function replaceTextInParsedLexical(
	lexical: LexicalTextObject,
	search: string,
	replace: string,
): { result: LexicalTextObject; replacementsMade: boolean } {
	const { text, children, ...newLexical } = lexical;
	let replacementsMade = false;
	if (children) {
		const replacedChildren = children.map((child) =>
			replaceTextInParsedLexical(child, search, replace),
		);
		replacementsMade = replacedChildren.some((child) => child.replacementsMade);
		newLexical.children = replacedChildren.map((child) => child.result);
	}
	if (text) {
		newLexical.text = text.replaceAll(search, replace);
		replacementsMade = replacementsMade || newLexical.text !== text;
	}
	return {
		result: newLexical,
		replacementsMade,
	};
}

/**
 * Deserializes a lexical string, replaces all instances of the search string with the replace string,
 * and then serializes it back to a string. Returns an error if the input is not a valid lexical object.
 *
 * @param lexicalString - The lexical string to process
 * @param target - The string to search for
 * @param replacement - The string to replace the target string with
 * @returns A Result containing the updated lexical string and a boolean indicating if any replacements were made, or a ParseError
 */
export function findAndReplace(
	lexicalString: string,
	target: string,
	replacement: string,
): Result<{ string: string; replacementsMade: boolean }, ParseError> {
	const deserialized = deserialize(lexicalString);
	if (deserialized.isErr()) {
		return err(deserialized.error);
	}

	const { result, replacementsMade } = replaceTextInParsedLexical(
		deserialized.value.root,
		target,
		replacement,
	);
	const replaced = {
		...deserialized.value,
		root: result,
	};

	return ok({
		string: JSON.stringify(replaced),
		replacementsMade,
	});
}
