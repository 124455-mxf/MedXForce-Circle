import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';
import {
  canParticipateInCircleOpenThread,
  canParticipateInCircleRestrictedThread,
  circleMemberThreadPostsCollection,
  isDiscussionThreadPost,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
  type CircleMemberThreadPostTranslation,
} from './circleMemberThreads';

export interface CircleMemberThreadPostReply {
  id: string;
  patientId: string;
  threadKind: CircleMemberThreadKind;
  postId: string;
  authorUid: string;
  authorName: string;
  authorRole: CircleMemberRole;
  text: string;
  createdAt: number;
  translations?: CircleMemberThreadPostTranslation[];
}

function parseCircleMemberThreadPostReplyTranslations(
  data: Record<string, unknown>,
): CircleMemberThreadPostTranslation[] | undefined {
  const raw = data.translations;
  if (!Array.isArray(raw)) return undefined;
  const parsed = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const language = typeof row.language === 'string' ? row.language.trim() : '';
      const text = typeof row.text === 'string' ? row.text.trim() : '';
      if (!language || !text) return null;
      return {
        language,
        text,
        ...(row.isAuto === true ? { isAuto: true as const } : {}),
      };
    })
    .filter((entry): entry is CircleMemberThreadPostTranslation => entry !== null);
  return parsed.length > 0 ? parsed : undefined;
}

export function parseCircleMemberThreadPostReply(
  id: string,
  data: Record<string, unknown>,
): CircleMemberThreadPostReply {
  return {
    id,
    patientId: String(data.patientId || ''),
    threadKind: data.threadKind === 'restricted' ? 'restricted' : 'open',
    postId: String(data.postId || ''),
    authorUid: String(data.authorUid || ''),
    authorName: String(data.authorName || 'Circle member'),
    authorRole: String(data.authorRole || 'friend') as CircleMemberRole,
    text: String(data.text || ''),
    createdAt: Number(data.createdAt || 0),
    translations: parseCircleMemberThreadPostReplyTranslations(data),
  };
}

export function circleMemberThreadPostRepliesCollection(
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
    'replies',
  );
}

export function canReplyToCircleMemberThreadPost(
  post: Pick<CircleMemberThreadPost, 'text' | 'postKind'>,
  memberRole: string,
  threadKind: CircleMemberThreadKind,
): boolean {
  if (!isDiscussionThreadPost(post)) return false;
  if (threadKind === 'open') return canParticipateInCircleOpenThread(memberRole);
  return canParticipateInCircleRestrictedThread(memberRole);
}

export function subscribeCircleMemberThreadPostReplies(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
  onChange: (replies: CircleMemberThreadPostReply[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const q = query(
    circleMemberThreadPostRepliesCollection(db, patientId, threadKind, postId),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) =>
          parseCircleMemberThreadPostReply(d.id, d.data() as Record<string, unknown>),
        ),
      );
    },
    (err) => onError?.(err.message || 'Could not load replies.'),
  );
}

export async function createCircleMemberThreadPostReply(
  db: Firestore,
  params: {
    patientId: string;
    threadKind: CircleMemberThreadKind;
    postId: string;
    post: Pick<CircleMemberThreadPost, 'text' | 'postKind' | 'replyCount'>;
    authorUid: string;
    authorName: string;
    authorRole: CircleMemberRole;
    text: string;
    translations?: CircleMemberThreadPostTranslation[];
  },
): Promise<string> {
  const body = params.text.trim();
  if (!body) throw new Error('Please write a reply before sending.');
  if (!canReplyToCircleMemberThreadPost(params.post, params.authorRole, params.threadKind)) {
    throw new Error('Replies are not available on this post.');
  }

  const now = Date.now();
  const repliesCol = circleMemberThreadPostRepliesCollection(
    db,
    params.patientId,
    params.threadKind,
    params.postId,
  );
  const postRef = doc(
    circleMemberThreadPostsCollection(db, params.patientId, params.threadKind),
    params.postId,
  );
  const replyRef = doc(repliesCol);
  const priorCount = params.post.replyCount ?? 0;
  const previewText =
    body.length <= 120 ? body : `${body.slice(0, 120).trimEnd()}…`;

  const batch = writeBatch(db);
  batch.set(replyRef, {
    patientId: params.patientId,
    threadKind: params.threadKind,
    postId: params.postId,
    authorUid: params.authorUid,
    authorName: params.authorName.trim() || 'Circle member',
    authorRole: params.authorRole,
    text: body,
    createdAt: now,
    ...(params.translations?.length ? { translations: params.translations } : {}),
  });
  batch.update(postRef, {
    respondLocked: true,
    replyCount: priorCount + 1,
    lastReplyAt: now,
    lastReplyAuthorUid: params.authorUid,
    lastReplyAuthorName: params.authorName.trim() || 'Circle member',
    lastReplyPreviewText: previewText,
  });

  await batch.commit();
  return replyRef.id;
}
