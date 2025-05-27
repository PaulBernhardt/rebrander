declare const __API_URL__: string;

export const API_URL = __API_URL__;

export function getApiUrl(path: string): string {
	// Remove leading slash if present
	const cleanPath = path.startsWith("/") ? path.slice(1) : path;
	return `${API_URL}/${cleanPath}`;
}

// Example usage:
// const response = await fetch(getApiUrl('api/details'));
