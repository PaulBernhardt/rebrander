/**
 * Escapes strings according to the Ghost Content API Filter documentation.
 * In particular, it means escaping single and double quotes.
 *
 * @see https://ghost.org/docs/content-api/#syntax-reference
 * @param str
 * @returns the escaped string
 */
export function escapeString(str: string): string {
	return str.replace(/['"]/g, "\\$&");
}
