// @ts-types="solid-js"
import {
	Index, // @ts-types="solid-js"
	Show,
} from "solid-js";

function RebrandErrors({ errors, url }: { errors: string[]; url: string }) {
	return (
		<Show when={errors.length > 0}>
			<h3>Posts that failed to update</h3>
			<Index each={errors}>
				{(postId, i) => (
					<ol>
						<a href={`${url}ghost/#/editor/post/${postId()}`}>
							{i + 1}: {postId()}
						</a>
					</ol>
				)}
			</Index>
		</Show>
	);
}

export default RebrandErrors;
