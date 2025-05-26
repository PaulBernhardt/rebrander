export function endUrlWithSlash(url: string) {
	if (url.endsWith("/")) {
		return url;
	}
	return `${url}/`;
}
