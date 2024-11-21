import * as core from "@actions/core"

// Get list of changed files
export async function getChangedFiles(githubClient, options, context) {
	if (!options.commit || !options.baseCommit) {
		core.setFailed(
			`The base and head commits are missing from the payload for this ${context.eventName} event.`,
		)
	}

	// Use GitHub's compare two commits API.
	// https://octokit.github.io/rest.js/v21/#repos-compare-commits-with-basehead
	const response = await githubClient.rest.repos.compareCommitsWithBasehead({
		owner: context.repo.owner,
		repo: context.repo.repo,
		basehead: `${options.baseCommit}...${options.commit}`,
	})

	if (response.status !== 200) {
		core.setFailed(
			`The GitHub API for comparing the base and head commits for this ${context.eventName} event returned ${response.status}, expected 200.`,
		)
	}

	// https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#compare-two-commits
	return response.data.files
		.filter(file => file.status == "modified" || file.status == "added")
		.map(file => file.filename)
}
