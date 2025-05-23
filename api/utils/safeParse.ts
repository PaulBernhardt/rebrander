import { type Result, err, ok } from "neverthrow";

export function safeParse<T>(json: string): Result<T, string> {
	try {
		return ok(JSON.parse(json));
	} catch (error) {
		return err(error instanceof Error ? error.message : "Unknown error");
	}
}
