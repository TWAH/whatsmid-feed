import { BskyAgent } from '@atproto/api';

export const Agent = new BskyAgent({
	service: 'https://bsky.social',
});

export const initAgent = async () => {
	await Agent.login({
		identifier: process.env.BSKY_IDENTIFIER!,
		password: process.env.BSKY_PASSWORD!,
	});
};
