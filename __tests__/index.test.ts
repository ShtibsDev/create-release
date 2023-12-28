/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import { context } from '@actions/github';
import * as main from '../src/main';

jest.mock('@actions/github');

const mockedContext = context as jest.Mock<typeof context>;

// Mock the action's entrypoint
const runMock = jest.spyOn(main, 'run').mockImplementation();

describe('Create Release', () => {
	let createRelease;

	beforeEach(() => {
		createRelease = jest.fn().mockReturnValueOnce({
			data: {
				id: 'releaseId',
				html_url: 'htmlUrl',
				upload_url: 'uploadUrl'
			}
		});

		mockedContext.mock.repo = {
			owner: 'owner',
			repo: 'repo'
		};
		s;
		context.sha = 'sha';

		const github = {
			repos: {
				createRelease
			}
		};

		GitHub.mockImplementation(() => github);
	});

	it('calls run when imported', async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('../src/index');

		expect(runMock).toHaveBeenCalled();
	});
});
