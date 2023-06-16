import { Agent } from './atp';
import { OutputSchema as RepoEvent, isCommit } from './lexicon/types/com/atproto/sync/subscribeRepos';
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription';

const parseUri = (uri: string) => {
	let stripped = uri.replace('at://', '');
	const [did, collection, rkey] = stripped.split('/');
	return { did, collection, rkey };
};
export class FirehoseSubscription extends FirehoseSubscriptionBase {
	async handleEvent(evt: RepoEvent) {
		if (!isCommit(evt)) return;
		const ops = await getOpsByType(evt);

		// // This logs the text of every post off the firehose.
		// // Just for fun :)
		// // Delete before actually using
		// for (const post of ops.posts.creates) {
		//   console.log(post.record.text)
		// }

		const postsToDelete = ops.posts.deletes.map((del) => del.uri);
		const allReposted = ops.reposts.creates.filter((create) => {
			// only posts reposted by WM
			return create.author === process.env.BSKY_DID!;
		});

		let getPostOps: Promise<{
			uri: string;
			cid: string;
			value: Record<any, any>;
			repostedAt: string;
		}>[] = allReposted.map(async (reposted) => {
			const { did, rkey } = parseUri(reposted.uri);
			const repost = await Agent.api.com.atproto.repo.getRecord({ collection: 'app.bsky.feed.repost', repo: did, rkey });

			const repostUri = (repost.data.value as any).subject.uri;
			const { did: repostDid, rkey: repostRkey } = parseUri(repostUri);
			let post = await Agent.getPost({ repo: repostDid, rkey: repostRkey });
			let postWithRepostedDate = (repost.data.value as any).createdAt ?? new Date().toISOString()
			return postWithRepostedDate;
		});

		const allPosts = await Promise.all(getPostOps);

		const postsToCreate = allPosts.map((post) => {
			return {
				uri: post.uri,
				cid: post.cid,
				replyParent: null,
				replyRoot: null,
				indexedAt: post.repostedAt
			};
		});
		if (postsToDelete.length > 0) {
			await this.db.deleteFrom('post').where('uri', 'in', postsToDelete).execute();
		}
		if (postsToCreate.length > 0) {
			await this.db
				.insertInto('post')
				.values(postsToCreate)
				.onConflict((oc) => oc.doNothing())
				.execute();
		}
	}
}
