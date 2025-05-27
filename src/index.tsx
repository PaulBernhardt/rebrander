import { Route, Router } from "@solidjs/router";
/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App.tsx";
import "./index.css";

/**
 * This is the entry point for the client code.
 * The expected path is '/', but there are routes
 * set up to allow controlling both the number of concurrent
 * updates, and the percentage of update that will artificially
 * fail.
 *
 * */

const root = document.getElementById("root");

if (root) {
	render(
		() => (
			<Router>
				<Route path="/" component={() => <App />} />
				<Route
					path="/concurrent/:concurrentUpdates"
					component={({ params }) => (
						<App concurrentUpdates={Number(params.concurrentUpdates)} />
					)}
				/>
				<Route
					path="/flake/:flakePercentage"
					component={({ params }) => (
						<App flakePercentage={Number(params.flakePercentage)} />
					)}
				/>
			</Router>
		),
		root,
	);
} else {
	throw new Error("Root element not found");
}
