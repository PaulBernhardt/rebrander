import { type Result, err, ok } from "neverthrow";

/**
 * A simple wrapper around JSON.parse that returns a Result instead of throwing an error.
 *
 * @param json - The JSON string to parse.
 * @returns A Result containing the parsed object if successful, or an error message if the JSON is invalid.
 */
export function safeParse<T>(json: string): Result<T, string> {
	try {
		return ok(JSON.parse(json));
	} catch (error) {
		return err(error instanceof Error ? error.message : "Unknown error");
	}
}
