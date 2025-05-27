/// <reference lib="deno.ns" />

/**
 * This is the entry used to build the server binary.
 */
import app from "./api/main.ts";
Deno.serve(app.fetch);
