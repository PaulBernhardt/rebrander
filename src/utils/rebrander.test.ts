import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { MockGhost } from "../../api/utils/mockGhost.ts";
import { TokenGenerator } from "../../api/utils/tokenGenerator.ts";
import { UpdaterClient, type WS } from "../../api/utils/updaterClient.ts";
import { createRebrander } from "./rebrander.ts";

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const URL = "https://test.glitteringvoid.ca";

const tokenGenerator = new TokenGenerator("12345", "67890");

type MockWebSocket = {
	onerror: (event: Event) => void;
	onmessage: (event: MessageEvent) => void;
	onopen: (event: Event) => void;
	onclose: (event: CloseEvent) => void;
	close: (code: number, reason: string) => void;
	send: (data: string) => void;
};

type MockClient = {
	update: { ws: { $ws: () => MockWebSocket } };
};

const mockWebSocket = (): MockWebSocket => {
	return {
		onerror: () => {},
		onmessage: () => {},
		onopen: () => {},
		onclose: () => {},
		close: () => {},
		send: () => {},
	};
};

const mockClient = (
	payload: MockWebSocket,
): { client: MockClient; updater: UpdaterClient } => {
	const updaterClient = new UpdaterClient();
	const wsProxy: WS = {
		close: (code, reason) => payload.onclose({ code, reason } as any),
		send: (data) => payload.onmessage({ data } as any),
	};
	payload.send = (data) => updaterClient.onMessage({ data } as any, wsProxy);
	return {
		client: {
			update: {
				ws: {
					$ws: () => payload,
				},
			},
		},
		updater: updaterClient,
	};
};

describe("rebrander", () => {
	const SERVER_URL = "https://updater.example.com";

	it("Should go to an error state if the server returns an error", async () => {
		const socket = mockWebSocket();
		const { client, updater } = mockClient(socket);
		updater.createGhostClient = () => {
			const mockGhost = new MockGhost(URL, tokenGenerator);
			return mockGhost;
		};
		const rebrander = createRebrander({
			url: "https://ghost.org",
			apiKey: "1234567890:12as",
			targetString: "The Sunday Star",
			replacementString: "Johnson's News & Co",
			host: SERVER_URL,
			client: client as any,
		});
		expect(rebrander.status()).toBe("loading");
		socket.onerror(new Event("error"));
		await sleep(10);
		expect(rebrander.status()).toBe("error");
	});

	it("Should go to an error state if it's not a ghost site", async () => {
		const socket = mockWebSocket();
		const { client, updater } = mockClient(socket);

		updater.createGhostClient = () => {
			const mockGhost = new MockGhost(URL, tokenGenerator);
			mockGhost.getSiteInfo = () =>
				Promise.resolve(err({ message: "RIP", type: "test" }));
			return mockGhost;
		};

		const rebrander = createRebrander({
			url: "https://not-ghost.org",
			apiKey: "1234567890:12as",
			targetString: "The Sunday Star",
			replacementString: "Johnson's News & Co",
			host: SERVER_URL,
			client: client as any,
		});
		socket.onopen(new Event("open"));
		await sleep(10);
		expect(rebrander.status()).toBe("error");
		expect(rebrander.error()).toBe("Unable to get site info: RIP");
	});

	it("Should go into an error state if the token is not valid", async () => {
		const socket = mockWebSocket();
		const { client, updater } = mockClient(socket);
		updater.createGhostClient = () => {
			const mockGhost = new MockGhost(URL, tokenGenerator);
			mockGhost.getAllPostIds = () =>
				Promise.resolve(err({ message: "Unauthorized", type: "test" }));
			return mockGhost;
		};
		const rebrander = createRebrander({
			url: "https://ghost.org",
			apiKey: "1234567890:12as",
			targetString: "The Sunday Star",
			replacementString: "Johnson's News & Co",
			host: SERVER_URL,
			client: client as any,
		});

		socket.onopen(new Event("open"));
		await sleep(10);
		expect(rebrander.status()).toBe("error");
		expect(rebrander.error()).toBe("Unable to update posts: Unauthorized");
	});

	it("should provide total and processed status updates, with errors", async () => {
		const socket = mockWebSocket();
		const { client, updater } = mockClient(socket);
		updater.createGhostClient = () => {
			const mockGhost = new MockGhost(URL, tokenGenerator);
			mockGhost.createMockPosts(10, "The Sunday Star");
			mockGhost.updatePost = (i) =>
				sleep(10).then(() =>
					i === "5" ? err({ message: "No good", type: "test" }) : ok(undefined),
				);
			return mockGhost;
		};

		const rebrander = createRebrander({
			url: "https://ghost.org",
			apiKey: "1234567890:12as",
			targetString: "The Sunday Star",
			replacementString: "Johnson's News & Co",
			host: SERVER_URL,
			client: client as any,
			concurrentUpdates: 1,
		});

		socket.onopen(new Event("open"));
		await sleep(1);
		expect(rebrander.status()).toBe("running");
		expect(rebrander.total()).toBe(10);
		expect(rebrander.processed()).toBe(0);
		expect(rebrander.failedUpdates).toEqual([]);
		expect(rebrander.updater()).toBeUndefined();
		for (let i = 0; i < 10; i++) {
			await sleep(10);
			expect(rebrander.processed()).toBe(i + 1);
		}
		expect(rebrander.status()).toBe("done");
		expect(rebrander.total()).toBe(10);
		expect(rebrander.processed()).toBe(10);
		expect(rebrander.failedUpdates).toEqual(["5"]);
		expect(rebrander.updater()).toEqual({
			error: 1,
			success: 9,
			total: 10,
		});
	});
});
