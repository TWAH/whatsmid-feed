import dotenv from 'dotenv';
import { AtpAgent, BlobRef } from '@atproto/api';
import fs from 'fs/promises';
import { ids } from '../src/lexicon/lexicons';

const run = async () => {
	dotenv.config();

	// YOUR bluesky handle
	// Ex: user.bsky.social
	const handle = process.env.FEEDGEN_PUBLISHER_HANDLE!;

	// YOUR bluesky password, or preferably an App Password (found in your client settings)
	// Ex: abcd-1234-efgh-5678
	const password = process.env.FEEDGEN_PUBLISHER_PASSWORD!;

	// A short name for the record that will show in urls
	// Lowercase with no spaces.
	// Ex: whats-hot
	const recordName = 'whats-mid';

	if (!process.env.FEEDGEN_SERVICE_DID && !process.env.FEEDGEN_HOSTNAME) {
		throw new Error('Please provide a hostname in the .env file');
	}
	// only update this if in a test environment
	const agent = new AtpAgent({ service: 'https://bsky.social' });
	await agent.login({ identifier: handle, password });

	try {
		await agent.api.app.bsky.feed.describeFeedGenerator();
	} catch (err) {
		throw new Error('The bluesky server is not ready to accept published custom feeds yet');
	}


	await agent.api.com.atproto.repo.deleteRecord({
		repo: agent.session?.did ?? '',
		collection: ids.AppBskyFeedGenerator,
		rkey: recordName,
	});

	console.log('All done 🎉');
};

run();
