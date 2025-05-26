// @ts-types="solid-js"
import { Index } from "solid-js";

function RebrandErrors({ errors, url }: { errors: string[]; url: string }) {
	return (
		<Index each={errors}>
			{(postId, i) => (
				<li>
					<a href={`${url}/ghost/#/editor/post/${postId()}`}>
						{i + 1}: {postId()}
					</a>
				</li>
			)}
		</Index>
	);
}

export default RebrandErrors;
