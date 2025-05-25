import { createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { expect, it, vi } from "vitest";

it("should have a null value when not a URL", () => {
	const [store, setStore] = createStore({
		siteInfo: null as string | null,
	});
	const fetch = vi.fn();

	createEffect(() => {
		fetch(store.siteInfo);
	});
	setStore("siteInfo", "https://example.com");
	setStore("siteInfo", null);
	setStore("siteInfo", "https://example2.com");
	expect(fetch).toHaveBeenCalledTimes(4);
	expect(fetch).toHaveBeenCalledWith("https://example.com");
	expect(fetch).toHaveBeenCalledWith(null);
	expect(fetch).toHaveBeenCalledWith("https://example2.com");
});

it("should have a null value when not a URL 2", () => {
	const [url, setUrl] = createSignal<string | null>(null);
	const fetch = vi.fn();

	createEffect(() => {
		fetch(url());
	});

	setUrl("https://example.com");
	setUrl("https://example2.com");
	expect(fetch).toHaveBeenCalledTimes(3);
});
