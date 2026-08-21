import {
  collection,
  doc,
  increment,
  onSnapshot,
  runTransaction,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  CircleMemberThreadKind,
  CircleMemberThreadPost,
  CircleMemberThreadPostTranslation,
} from './circleMemberThreads';
import { circleMemberThreadPostsCollection } from './circleMemberThreads';

export const CIRCLE_POLL_MIN_OPTIONS = 2;
export const CIRCLE_POLL_MAX_OPTIONS = 5;
export const CIRCLE_POLL_OPTION_MAX_CHARS = 80;
export const CIRCLE_POLL_DESCRIPTION_MAX_CHARS = 1000;

export type CirclePollVote = {
  uid: string;
  optionIndex: number;
  createdAt: number;
  voterName: string;
  updatedAt?: number;
};

export function isPollThreadPost(post: { postKind?: string; pollOptions?: string[] }): boolean {
  return post.postKind === 'poll' || (Array.isArray(post.pollOptions) && post.pollOptions.length >= 2);
}

export function isCirclePollClosed(
  post: Pick<CircleMemberThreadPost, 'pollClosedAt' | 'pollClosesAt'>,
  now = Date.now(),
): boolean {
  if (typeof post.pollClosedAt === 'number' && post.pollClosedAt > 0) return true;
  return typeof post.pollClosesAt === 'number' && post.pollClosesAt > 0 && now >= post.pollClosesAt;
}

/** Open polls, newest first. Closed and expired polls are ignored. */
export function openCirclePolls(
  posts: readonly CircleMemberThreadPost[],
  now = Date.now(),
): CircleMemberThreadPost[] {
  return posts
    .filter((post) => isPollThreadPost(post) && !isCirclePollClosed(post, now))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Newest poll that is still open. Closed and expired polls are ignored. */
export function newestOpenCirclePoll(
  posts: readonly CircleMemberThreadPost[],
  now = Date.now(),
): CircleMemberThreadPost | null {
  return openCirclePolls(posts, now)[0] ?? null;
}

export function parseCirclePollOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw.slice(0, CIRCLE_POLL_MAX_OPTIONS)) {
    const label = typeof item === 'string' ? item.trim() : '';
    if (!label) continue;
    out.push(label.slice(0, CIRCLE_POLL_OPTION_MAX_CHARS));
  }
  return out;
}

export function sanitizeCirclePollOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of options) {
    const label = raw.trim().slice(0, CIRCLE_POLL_OPTION_MAX_CHARS);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= CIRCLE_POLL_MAX_OPTIONS) break;
  }
  return out;
}

export function circleMemberThreadPostVotesCollection(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
) {
  return collection(
    db,
    'patients',
    patientId,
    'circle_threads',
    threadKind,
    'posts',
    postId,
    'votes',
  );
}

export function parseCirclePollVote(uid: string, data: Record<string, unknown>): CirclePollVote | null {
  const optionIndex = typeof data.optionIndex === 'number' ? data.optionIndex : NaN;
  if (!Number.isInteger(optionIndex) || optionIndex < 0) return null;
  return {
    uid,
    optionIndex,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    voterName: typeof data.voterName === 'string' && data.voterName.trim() ? data.voterName.trim() : 'Circle member',
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
  };
}

export function tallyCirclePollVotes(
  optionCount: number,
  votes: CirclePollVote[],
): number[] {
  const counts = Array.from({ length: optionCount }, () => 0);
  for (const vote of votes) {
    if (vote.optionIndex >= 0 && vote.optionIndex < counts.length) {
      counts[vote.optionIndex] += 1;
    }
  }
  return counts;
}

/** Option order, e.g. "Hamilton 3 · Antonelli 2". */
export function formatCirclePollResultsTally(options: string[], counts: number[]): string {
  return options
    .map((option, index) => `${option.trim()} ${counts[index] ?? 0}`)
    .filter((part) => part.trim())
    .join(' · ');
}

export function subscribeCirclePollVotes(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
  onChange: (votes: CirclePollVote[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    circleMemberThreadPostVotesCollection(db, patientId, threadKind, postId),
    (snap) => {
      const votes: CirclePollVote[] = [];
      for (const row of snap.docs) {
        const parsed = parseCirclePollVote(row.id, row.data() as Record<string, unknown>);
        if (parsed) votes.push(parsed);
      }
      onChange(votes);
    },
    (err) => onError?.(err.message || 'Could not load votes.'),
  );
}

export async function castCirclePollVote(
  db: Firestore,
  params: {
    patientId: string;
    threadKind: CircleMemberThreadKind;
    postId: string;
    uid: string;
    voterName: string;
    optionIndex: number;
    optionCount: number;
  },
): Promise<void> {
  if (
    !Number.isInteger(params.optionIndex) ||
    params.optionIndex < 0 ||
    params.optionIndex >= params.optionCount
  ) {
    throw new Error('Choose a poll option.');
  }
  const voteRef = doc(
    circleMemberThreadPostVotesCollection(db, params.patientId, params.threadKind, params.postId),
    params.uid,
  );
  const postRef = doc(
    circleMemberThreadPostsCollection(db, params.patientId, params.threadKind),
    params.postId,
  );
  const voterName = params.voterName.trim() || 'Circle member';
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(voteRef);
    if (existing.exists()) {
      tx.update(voteRef, { optionIndex: params.optionIndex, updatedAt: Date.now() });
      return;
    }
    tx.set(voteRef, {
      optionIndex: params.optionIndex,
      createdAt: Date.now(),
      voterName: voterName.slice(0, 200),
    });
    tx.update(postRef, { pollVoteCount: increment(1) });
  });
}

export async function closeCirclePoll(
  db: Firestore,
  params: {
    patientId: string;
    threadKind: CircleMemberThreadKind;
    postId: string;
  },
): Promise<void> {
  const postRef = doc(
    circleMemberThreadPostsCollection(db, params.patientId, params.threadKind),
    params.postId,
  );
  await updateDoc(postRef, { pollClosedAt: Date.now() });
}

export function canCloseCirclePoll(
  post: Pick<CircleMemberThreadPost, 'authorUid' | 'postKind' | 'pollOptions' | 'pollClosedAt' | 'pollClosesAt'>,
  uid: string,
  isProxy: boolean,
): boolean {
  if (!isPollThreadPost(post) || isCirclePollClosed(post)) return false;
  return post.authorUid === uid || isProxy;
}

export function canEditCirclePoll(
  post: Pick<CircleMemberThreadPost, 'authorUid' | 'postKind' | 'pollOptions' | 'pollClosedAt' | 'pollClosesAt'>,
  uid: string,
  now = Date.now(),
): boolean {
  if (!isPollThreadPost(post) || isCirclePollClosed(post, now)) return false;
  return post.authorUid === uid;
}

export async function updateCirclePoll(
  db: Firestore,
  params: {
    patientId: string;
    threadKind: CircleMemberThreadKind;
    postId: string;
    hasVotes: boolean;
    closesAt: number;
    question?: string;
    options?: string[];
    description?: string;
    translations?: CircleMemberThreadPostTranslation[];
  },
): Promise<void> {
  if (!Number.isFinite(params.closesAt) || params.closesAt <= Date.now()) {
    throw new Error('Choose a future close date.');
  }
  const postRef = doc(
    circleMemberThreadPostsCollection(db, params.patientId, params.threadKind),
    params.postId,
  );
  if (params.hasVotes) {
    await updateDoc(postRef, { pollClosesAt: params.closesAt });
    return;
  }
  const question = (params.question ?? '').trim();
  const options = sanitizeCirclePollOptions(params.options ?? []);
  const description = (params.description ?? '').trim().slice(0, CIRCLE_POLL_DESCRIPTION_MAX_CHARS);
  if (!question) throw new Error('Write a poll question.');
  if (options.length < CIRCLE_POLL_MIN_OPTIONS) {
    throw new Error('Add at least two poll options.');
  }
  await updateDoc(postRef, {
    text: question,
    pollOptions: options,
    pollDescription: description,
    pollClosesAt: params.closesAt,
    translations: params.translations ?? [],
  });
}
