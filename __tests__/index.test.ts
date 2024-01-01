import { run } from '../src/index';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { readFile } from 'fs/promises'; //eslint-disable-line @typescript-eslint/no-unused-vars

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('fs/promises');

describe('Create Release', () => {
	const getInput = core.getInput as jest.Mock;
	const getOctokit = github.getOctokit as jest.Mock;

	let originalEnv: NodeJS.ProcessEnv; //eslint-disable-line no-undef
	const owner = 'owner';
	const repo = 'repo';

	(github.context as object) = { repo: { owner, repo }, sha: 'sha' };

	const mockCreateReleaseResponse = {
		data: {
			id: 123,
			html_url: `https://github.com/${owner}/${repo}/releases/tag/v1.0.0`,
			upload_url: 'https://github.com/upload'
		}
	};

	const mockOctokit = {
		request: jest.fn().mockResolvedValueOnce(mockCreateReleaseResponse)
	};

	beforeAll(() => {
		originalEnv = process.env;
		process.env = { ...originalEnv, GITHUB_TOKEN: 'fakeToken' };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('Should set outputs', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('myBody')
			.mockReturnValueOnce('false')
			.mockReturnValueOnce('false');

		getOctokit.mockReturnValueOnce(mockOctokit);

		(core.setOutput as jest.Mock) = jest.fn();

		await run();

		expect(core.setOutput).toHaveBeenNthCalledWith(1, 'id', 123);
		expect(core.setOutput).toHaveBeenNthCalledWith(2, 'html_url', `https://github.com/owner/repo/releases/tag/v1.0.0`);
		expect(core.setOutput).toHaveBeenNthCalledWith(3, 'upload_url', 'https://github.com/upload');
	});

	it('Should create a release', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('myBody')
			.mockReturnValueOnce('false')
			.mockReturnValueOnce('false');

		const mockOctokit = {
			request: jest.fn().mockResolvedValueOnce(mockCreateReleaseResponse)
		};
		getOctokit.mockReturnValueOnce(mockOctokit);

		await run();

		expect(mockOctokit.request).toHaveBeenCalledWith('POST /repos/owner/repo/releases', {
			owner: 'owner',
			repo: 'repo',
			tag_name: 'v1.0.0',
			name: 'myRelease',
			body: 'myBody',
			draft: false,
			prerelease: false,
			target_commitish: 'sha'
		});
	});

	it('Should create a draft release', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('myBody')
			.mockReturnValueOnce('true')
			.mockReturnValueOnce('false');

		getOctokit.mockReturnValueOnce(mockOctokit);

		await run();

		expect(mockOctokit.request).toHaveBeenCalledWith('POST /repos/owner/repo/releases', {
			owner: 'owner',
			repo: 'repo',
			tag_name: 'v1.0.0',
			name: 'myRelease',
			body: 'myBody',
			draft: true,
			prerelease: false,
			target_commitish: 'sha'
		});
	});

	it('Should create a pre-release', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('myBody')
			.mockReturnValueOnce('false')
			.mockReturnValueOnce('true');

		getOctokit.mockReturnValueOnce(mockOctokit);

		await run();

		expect(mockOctokit.request).toHaveBeenCalledWith('POST /repos/owner/repo/releases', {
			owner: 'owner',
			repo: 'repo',
			tag_name: 'v1.0.0',
			name: 'myRelease',
			body: 'myBody',
			draft: false,
			prerelease: true,
			target_commitish: 'sha'
		});
	});

	it('Should create an empty body release', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('') // <-- The default value for body in action.yml
			.mockReturnValueOnce('false')
			.mockReturnValueOnce('false');

		getOctokit.mockReturnValueOnce(mockOctokit);

		await run();

		expect(mockOctokit.request).toHaveBeenCalledWith('POST /repos/owner/repo/releases', {
			owner: 'owner',
			repo: 'repo',
			tag_name: 'v1.0.0',
			name: 'myRelease',
			body: '',
			draft: false,
			prerelease: false,
			target_commitish: 'sha'
		});
	});

	it('Should create a release with a body based on a file', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('') // <-- The default value for body in action.yml
			.mockReturnValueOnce('false')
			.mockReturnValueOnce('false')
			.mockReturnValueOnce(null)
			.mockReturnValueOnce('notes.md');

		(readFile as jest.Mock) = jest
			.fn()
			.mockResolvedValueOnce('# this is a release\nThe markdown is strong in this one.');

		getOctokit.mockReturnValueOnce(mockOctokit);

		await run();

		expect(mockOctokit.request).toHaveBeenCalledWith('POST /repos/owner/repo/releases', {
			owner: 'owner',
			repo: 'repo',
			tag_name: 'v1.0.0',
			name: 'myRelease',
			body: '# this is a release\nThe markdown is strong in this one.',
			draft: false,
			prerelease: false,
			target_commitish: 'sha'
		});
	});

	it('Should fail elegantly if octokit throws an exception', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('myBody')
			.mockReturnValueOnce('false')
			.mockReturnValueOnce('false');

		const mockOctokit = {
			request: jest.fn().mockImplementation(() => {
				throw new Error('Error creating release');
			})
		};
		getOctokit.mockReturnValueOnce(mockOctokit);

		(core.setOutput as jest.Mock) = jest.fn();
		(core.setFailed as jest.Mock) = jest.fn();

		await run();

		expect(mockOctokit.request).toHaveBeenCalled();
		expect(core.setFailed).toHaveBeenCalledWith('Error creating release');
		expect(core.setOutput).toHaveBeenCalledTimes(0);
	});

	it('Should fail elegantly if cannot read body file', async () => {
		getInput
			.mockReturnValueOnce('refs/tags/v1.0.0')
			.mockReturnValueOnce('myRelease')
			.mockReturnValueOnce('') // <-- The default value for body in action.yml
			.mockReturnValueOnce('false')
			.mockReturnValueOnce('false')
			.mockReturnValueOnce(null)
			.mockReturnValueOnce('notes.md');

		(readFile as jest.Mock) = jest.fn().mockImplementation(() => {
			throw new Error('Error');
		});

		getOctokit.mockReturnValueOnce(mockOctokit);
		(core.setFailed as jest.Mock) = jest.fn();

		await run();

		expect(core.setFailed).toHaveBeenCalledWith('Error');
	});
});
