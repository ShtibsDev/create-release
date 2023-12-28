import { getInput, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { readFileSync } from 'fs';
import { Octokit } from 'octokit';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
	try {
		const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

		// Get owner and repo from context of payload that triggered the action
		const { owner: currentOwner, repo: currentRepo } = context.repo;

		// Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
		const tagName = getInput('tag_name', { required: true });

		// This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
		const tag = tagName.replace('refs/tags/', '');
		const releaseName = getInput('release_name', {
			required: false
		}).replace('refs/tags/', '');
		const body = getInput('body', { required: false });
		const draft = getInput('draft', { required: false }) === 'true';
		const prerelease = getInput('prerelease', { required: false }) === 'true';
		const commitish = getInput('commitish', { required: false }) || context.sha;

		const bodyPath = getInput('body_path', { required: false });
		const owner = getInput('owner', { required: false }) || currentOwner;
		const repo = getInput('repo', { required: false }) || currentRepo;
		let bodyFileContent = null;

		if (bodyPath !== '' && !!bodyPath) {
			try {
				bodyFileContent = readFileSync(bodyPath, { encoding: 'utf8' });
			} catch (error) {
				if (error instanceof Error) setFailed(error.message);
			}
		}

		// Create a release
		// API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
		// Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
		const createReleaseResponse = await octokit.request(`POST /repos/${owner}/${repo}/releases`, {
			owner,
			repo,
			tag_name: tag,
			name: releaseName,
			body: bodyFileContent || body,
			draft,
			prerelease,
			target_commitish: commitish
		});

		// Get the ID, html_url, and upload URL for the created Release from the response
		const {
			data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
		} = createReleaseResponse;

		// Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
		setOutput('id', releaseId);
		setOutput('html_url', htmlUrl);
		setOutput('upload_url', uploadUrl);
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) setFailed(error.message);
	}
}
