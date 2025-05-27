/**
 * Ensure a string ends with a slash, by adding one if it doesn't.
 *
 * @param url - The URL to ensure ends with a slash.
 * @returns The URL with a slash added if it didn't already have one.
 */
export function endUrlWithSlash(url: string) {
	if (url.endsWith("/")) {
		return url;
	}
	return `${url}/`;
}
