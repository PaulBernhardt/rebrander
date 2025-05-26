import { Route, Router } from "@solidjs/router";
/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App.tsx";
import "./index.css";

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
