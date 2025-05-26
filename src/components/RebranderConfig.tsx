import { createSignal } from "solid-js";

function Rebrander({
	submit,
}: {
	submit: (
		apiKey: string,
		targetString: string,
		replacementString: string,
	) => void;
}) {
	const [apiKey, setApiKey] = createSignal("");
	const [targetString, setTargetString] = createSignal("The Sunday Star");
	const [replacementString, setReplacementString] = createSignal(
		"Johnson's News & Co",
	);

	const handleGo = () => {
		submit(apiKey(), targetString(), replacementString());
	};

	return (
		<div class="rebrander-container">
			<div class="instructions">
				<p>
					Create a{" "}
					<a href="https://ghost.org/integrations/custom-integrations/">
						Custom Integration
					</a>{" "}
					for your Ghost site and enter the Admin API key, along with the phrase
					you want to replace, and the new phrase you want to replace it with.
				</p>
				<p>Note: This is CASE SENSITIVE.</p>
			</div>
			<div class="input-group">
				<label for="api-key">Admin API Key</label>
				<input
					id="api-key"
					type="password"
					value={apiKey()}
					onInput={(e) => setApiKey(e.currentTarget.value)}
					placeholder="Enter your API key"
				/>
			</div>
			<div class="input-group">
				<label for="target-string">Target String:</label>
				<input
					id="target-string"
					type="text"
					value={targetString()}
					onInput={(e) => setTargetString(e.currentTarget.value)}
					placeholder="String to replace"
				/>
			</div>
			<div class="input-group">
				<label for="replacement-string">Replacement String:</label>
				<input
					id="replacement-string"
					type="text"
					value={replacementString()}
					onInput={(e) => setReplacementString(e.currentTarget.value)}
					placeholder="New string"
				/>
			</div>
			<button
				type="button"
				class="go-button"
				onClick={handleGo}
				disabled={!apiKey() || !targetString() || !replacementString()}
			>
				Go
			</button>

			<div class="example">
				<h3>Example</h3>
				Before:
				<p>Welcome to the {targetString()}! We hope you enjoy your stay.</p>
				After:
				<p>
					Welcome to the {replacementString()}! We hope you enjoy your stay.
				</p>
			</div>
		</div>
	);
}

export default Rebrander;
