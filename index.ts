/// <reference lib="deno.ns" />

/**
 * This is the entry used to build the server binary.
 *
 * @See {@link api/main.ts} for the server code,
 * @see {@link src/App.tsx} for the client code.
 */
import app from "./api/main.ts";
Deno.serve(app.fetch);
