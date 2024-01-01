import { getInput, setFailed, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { readFile } from 'fs/promises';

type ActionInput = {
	tag: string;
	releaseName: string;
	body: string;
	draft: boolean;
	prerelease: boolean;
	commitish: string;
	bodyPath: string;
	owner: string;
	repo: string;
};

export async function run(): Promise<void> {
	try {
		const githubToken = process.env.GITHUB_TOKEN;

		if (!githubToken) {
			setFailed('No Github Token was provided');
			return;
		}

		const octokit = getOctokit(githubToken);
		const { tag, releaseName, body, draft, prerelease, commitish, bodyPath, owner, repo } = getInputs();
		const bodyFileContent = await getBodyFileContent(bodyPath);

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

		const {
			data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
		} = createReleaseResponse;

		console.count('test');

		setOutput('id', releaseId);
		setOutput('html_url', htmlUrl);
		setOutput('upload_url', uploadUrl);
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}

run();

function getInputs(): ActionInput {
	const { owner: currentOwner, repo: currentRepo } = context.repo;

	const tagName = getInput('tag_name', { required: true });

	// This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
	const tag = tagName.replace('refs/tags/', '');
	const releaseName = getInput('release_name', { required: false }).replace('refs/tags/', '');

	const body = getInput('body', { required: false });
	const draft = getInput('draft', { required: false }) === 'true';
	const prerelease = getInput('prerelease', { required: false }) === 'true';
	const commitish = getInput('commitish', { required: false }) || context.sha;

	const bodyPath = getInput('body_path', { required: false });
	const owner = getInput('owner', { required: false }) || currentOwner;
	const repo = getInput('repo', { required: false }) || currentRepo;

	return { tag, releaseName, body, draft, prerelease, commitish, bodyPath, owner, repo };
}

async function getBodyFileContent(bodyPath: string): Promise<string | null> {
	if (!bodyPath) return null;

	try {
		const bodyFileContent = await readFile(bodyPath, { encoding: 'utf8' });
		return bodyFileContent;
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
		return null;
	}
}
