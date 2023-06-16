import { Agent } from './atp';
import { Database } from './db';
import { FeedViewPost } from './lexicon/types/app/bsky/feed/defs';

export const preload = async (db: Database) => {
	const posts = await midPreload();
	const parsedPosts = posts.map((post) => {
		return {
			uri: post.post.uri,
			cid: post.post.cid,
			replyParent: (post.post.record as any)?.reply?.parent.uri ?? null,
			replyRoot: (post.post.record as any)?.reply?.root.uri ?? null,
			indexedAt: new Date().toISOString(),
		};
	});
    await db
        .insertInto('post')
        .values(parsedPosts)
        .onConflict((oc) => oc.doNothing())
        .execute()
};

const midPreload = async (posts: FeedViewPost[] = [], cursor?: string): Promise<FeedViewPost[]> => {
	const preloadLimit = process.env.ENV === 'PROD' ? 100 : 10;
	const feed = await Agent.getAuthorFeed({ actor: process.env.BSKY_DID!, cursor, limit: preloadLimit });
	const currentPosts = [...posts, ...feed.data.feed];
	if (cursor) {
		//Only go back 200 posts so quit if we have a cursor from a previous run
		return currentPosts;
	}
	const nextCursor = feed.data.cursor;
	if (nextCursor) {
		return midPreload(currentPosts, nextCursor);
	}
	return currentPosts;
};
