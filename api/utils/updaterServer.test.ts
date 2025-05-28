import { expect, fn } from "jsr:@std/expect";
import { err, ok } from "neverthrow";
import { MockGhost } from "./mockGhost.ts";
import { TokenGenerator } from "./tokenGenerator.ts";
import { UpdaterServer } from "./updaterServer.ts";

const targetString = "super secret";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const URL = "https://test.glitteringvoid.ca";

const tokenGenerator = new TokenGenerator("12345", "67890");

const standardMessage = {
	type: "message",
	data: {
		toString: () =>
			JSON.stringify({
				url: "https://example.com",
				token: "12345:67890",
				targetString,
				replacementString: "replacement",
			}),
	},
};

const standardMessageOneConcurrentUpdate = {
	...standardMessage,
	data: {
		toString: () =>
			JSON.stringify({
				url: "https://example.com",
				token: "12345:67890",
				targetString,
				replacementString: "replacement",
				concurrentUpdates: 1,
			}),
	},
};
Deno.test("UpdaterServer - should return an error and close the connection if the first message does not contain the url and token", async (t) => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();
	await client.onMessage(
		{
			type: "message",
			data: {
				toString: () => "bad data",
			},
		},
		{
			close: close as any,
			send: send as any,
		},
	);
	expect(close).toHaveBeenCalledWith(
		4400,
		"Invalid request, expected valid JSON",
	);
	expect(send).not.toHaveBeenCalled();
});

Deno.test("UpdaterServer - should return an error and close the connection if the first message does not match the schema", async (t) => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();
	await client.onMessage(
		{
			type: "message",
			data: {
				toString: () =>
					JSON.stringify({
						url: "https://example.com",
						token: "1234567890", // Missing the colon
						targetString: "target",
						replacementString: "replacement",
					}),
			},
		},
		{
			close: close as any,
			send: send as any,
		},
	);
	expect(close).toHaveBeenCalledWith(
		4400,
		expect.stringContaining("Invalid request: "),
	);
	expect(send).not.toHaveBeenCalled();
});

Deno.test("UpdaterServer - should return an error and close the connection if targetString is too short", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();
	await client.onMessage(
		{
			type: "message",
			data: {
				toString: () =>
					JSON.stringify({
						url: "https://example.com",
						token: "12345:67890",
						targetString: "",
						replacementString: "replacement",
					}),
			},
		},
		{
			close: close as any,
			send: send as any,
		},
	);
	expect(close).toHaveBeenCalledWith(
		4400,
		expect.stringContaining("Invalid request: "),
	);
	expect(send).not.toHaveBeenCalled();
});

Deno.test("UpdaterServer - should return an error and close the connection if replacementString is too short", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();
	await client.onMessage(
		{
			type: "message",
			data: {
				toString: () =>
					JSON.stringify({
						url: "https://example.com",
						token: "12345:67890",
						targetString: "target",
						replacementString: "",
					}),
			},
		},
		{
			close: close as any,
			send: send as any,
		},
	);
	expect(close).toHaveBeenCalledWith(
		4400,
		expect.stringContaining("Invalid request: "),
	);
	expect(send).not.toHaveBeenCalled();
});

Deno.test("UpdaterServer - should return an error and close the connection if concurrentUpdates is too low", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();
	await client.onMessage(
		{
			type: "message",
			data: {
				toString: () =>
					JSON.stringify({
						url: "https://example.com",
						token: "12345:67890",
						targetString: "target",
						replacementString: "replacement",
						concurrentUpdates: 0,
					}),
			},
		},
		{
			close: close as any,
			send: send as any,
		},
	);
	expect(close).toHaveBeenCalledWith(
		4400,
		expect.stringContaining("Invalid request: "),
	);
	expect(send).not.toHaveBeenCalled();
});

Deno.test("UpdaterServer - should return an error and close the connection if concurrentUpdates is too high", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();
	await client.onMessage(
		{
			type: "message",
			data: {
				toString: () =>
					JSON.stringify({
						url: "https://example.com",
						token: "12345:67890",
						targetString: "target",
						replacementString: "replacement",
						concurrentUpdates: 101,
					}),
			},
		},
		{
			close: close as any,
			send: send as any,
		},
	);
	expect(close).toHaveBeenCalledWith(
		4400,
		expect.stringContaining("Invalid request: "),
	);
	expect(send).not.toHaveBeenCalled();
});
Deno.test("UpdaterServer - should return an error and close the connection if the url is not a valid ghost url", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();

	client.createGhostClient = fn(() => {
		const mockGhost = new MockGhost(URL, tokenGenerator);
		mockGhost.getSiteInfo = () =>
			Promise.resolve(
				err({ message: "error getting site info", type: "test" }),
			);
		return mockGhost;
	}) as any;
	await client.onMessage(standardMessage, {
		close: close as any,
		send: send as any,
	});
	expect(close).toHaveBeenCalledWith(
		4400,
		"Unable to get site info: error getting site info",
	);
	expect(send).not.toHaveBeenCalled();
});

Deno.test("UpdaterServer - should return an error and close the connection if a second message is sent", () => {});
Deno.test("UpdaterServer - should return an error and close the connection if token does not have access to fetch posts for the url", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();

	client.createGhostClient = fn(() => {
		const mockGhost = new MockGhost(URL, tokenGenerator);
		mockGhost.getAllPostIds = () =>
			Promise.resolve(err({ message: "Unauthorized", type: "test" }));
		return mockGhost;
	}) as any;
	await client.onMessage(standardMessage, {
		close: close as any,
		send: send as any,
	});
	expect(close).toHaveBeenCalledWith(
		4400,
		"Unable to update posts: Unauthorized",
	);
	expect(send).not.toHaveBeenCalled();
});

Deno.test("UpdateClient - send should send a message to the websocket with the right type and data", async () => {
	const client = new UpdaterServer();
	const ws = {
		send: fn(),
	};
	UpdaterServer.send(ws as any, {
		type: "status",
		data: { total: 100, processed: 0 },
	});
	expect(ws.send).toHaveBeenCalledWith(
		'{"type":"status","data":{"total":100,"processed":0}}',
	);

	UpdaterServer.send(ws as any, {
		// @ts-expect-error - This function should complain if the type is not valid
		type: "fake",
	});

	// It will still send the message though
	expect(ws.send).toHaveBeenCalledWith('{"type":"fake"}');
});

Deno.test("UpdaterServer - should send a status update with the total number of posts to process", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();

	const mockGhost = new MockGhost(URL, tokenGenerator);
	mockGhost.createMockPosts(100, targetString);

	client.createGhostClient = () => {
		return mockGhost;
	};

	client.onMessage(standardMessage, {
		close: close as any,
		send: send as any,
	});
	await sleep(1);

	expect(send).toHaveBeenCalled();

	expect(send).toHaveBeenCalledWith(
		JSON.stringify({
			type: "status",
			data: {
				total: 100,
				processed: 0,
			},
		}),
	);
});

Deno.test("UpdaterServer - Should abort the update if the connection is closed", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();

	const mockGhost = new MockGhost(URL, tokenGenerator);
	await mockGhost.createMockPosts(100, targetString);

	mockGhost.updatePost = fn(async () => {
		await sleep(10);
		return ok(undefined);
	}) as any;
	client.createGhostClient = () => {
		return mockGhost;
	};

	client.onMessage(standardMessageOneConcurrentUpdate, {
		close: close as any,
		send: send as any,
	});
	await sleep(1);
	client.abort = fn(client.abort) as any;
	client.onClose(
		{
			type: "close",
			code: 1000,
			reason: "Connection closed",
			wasClean: true,
		},
		{
			close: close as any,
			send: send as any,
		},
	);
	await sleep(1);

	expect(client.abort).toHaveBeenCalledTimes(1);
	expect(mockGhost.updatePost).toHaveBeenCalledTimes(1);
	// Wait for the update to finish
	await sleep(10);
});

Deno.test("UpdaterServer - Should stream status updates", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();

	const mockGhost = new MockGhost(URL, tokenGenerator);
	await mockGhost.createMockPosts(1000, targetString);

	client.createGhostClient = () => {
		return mockGhost;
	};

	client.onMessage(standardMessage, {
		close: close as any,
		send: send as any,
	});

	await sleep(10);
	for (let i = 0; i < 10; i++) {
		expect(send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "status",
				data: { total: 1000, processed: i * 10 },
			}),
		);
	}
	expect(send).toHaveBeenCalledWith(
		JSON.stringify({
			type: "success",
			data: { total: 1000, success: 1000, error: 0 },
		}),
	);

	// 1000 status updates, 1 success update, 1 initial status update
	expect(send).toHaveBeenCalledTimes(100 + 2);
});

Deno.test("UpdaterServer - Should send an error for failed updates", async () => {
	const client = new UpdaterServer();
	const close = fn();
	const send = fn();

	const mockGhost = new MockGhost(URL, tokenGenerator);
	await mockGhost.createMockPosts(1000, targetString);
	let called = 0;
	mockGhost.updatePost = fn(async () => {
		called++;
		if (called % 250 === 0) {
			return err({ message: "Failed to update post", type: "test" });
		}
		return ok(undefined);
	}) as any;

	client.createGhostClient = () => {
		return mockGhost;
	};

	client.onMessage(standardMessage, {
		close: close as any,
		send: send as any,
	});

	await sleep(10);

	for (let i = 0; i < 10; i++) {
		expect(send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "status",
				data: { total: 1000, processed: i * 10 },
			}),
		);
	}
	for (let i = 1; i <= 4; i++) {
		expect(send).toHaveBeenCalledWith(
			JSON.stringify({
				type: "error",
				data: { postId: `${i * 250 - 1}` },
			}),
		);
	}
	expect(send).toHaveBeenCalledWith(
		JSON.stringify({
			type: "success",
			data: { total: 1000, success: 996, error: 4 },
		}),
	);
	// 1000 status updates, 1 success update, 4 error updates, 1 initial status update
	expect(send).toHaveBeenCalledTimes(100 + 1 + 4 + 1);
});
