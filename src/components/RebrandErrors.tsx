import { Index, Show } from "solid-js";

/**
 * This component displays a list of posts that failed to update,
 * with links to the Ghost editor for each post.
 *
 * @param errors - The list of post IDs that failed to update.
 * @param url - The URL of the Ghost instance.
 * @returns The RebrandErrors component.
 */
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
