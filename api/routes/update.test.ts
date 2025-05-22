import { hc } from "hono/client";
import { expect } from "jsr:@std/expect";
import { assertSpyCalls, spy } from "jsr:@std/testing/mock";
import app from "./update.ts";
function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("when the client connects", async (t) => {
	const server = Deno.serve({ port: 0 }, app.fetch);
	await t.step(
		"it should return an error and close the connection if the first message does not contain the url and token",
		async () => {
			const client = hc<typeof app>(
				`http://${server.addr.hostname}:${server.addr.port}`,
			);
			const socket = client.ws.$ws();
			const onOpen = spy(() => {
				socket.send("bad data");
			});
			const onClose = spy((_) => {});
			const onError = spy(() => {});
			socket.onopen = onOpen as any;
			socket.onclose = onClose as any;
			socket.onerror = onError as any;

			await sleep(1000);
			expect(socket.readyState).toBe(WebSocket.CLOSED);
			assertSpyCalls(onOpen, 1);
			assertSpyCalls(onClose, 1);
			assertSpyCalls(onError, 0);

			expect(onClose.calls[0].args[0]).toMatchObject({
				code: 4400,
				reason: "Invalid request, expected a valid url and token",
			});
		},
	);
	server.shutdown();
});
