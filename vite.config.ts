import { defineConfig, loadEnv } from "vite";

import solid from "vite-plugin-solid";
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "REBRANDER");
	console.log("REBRANDER_HOST", env.REBRANDER_HOST);
	return {
		plugins: [solid()],
		test: {
			include: ["src/**/*.test.ts"],
		},
		define: {
			__REBRANDER_HOST__: JSON.stringify(
				env.REBRANDER_HOST ?? "http://localhost:8000",
			),
		},
	};
});
