import { isVisitCaptureThreadPost } from '@medxforce/shared';
import { writeFormattedTextToClipboard } from './formattedClipboard';
import { writeVisitCaptureToClipboard } from './visitCaptureClipboard';

type CircleThreadPostClipboardInput = {
  text: string;
  authorName: string;
  createdAt: number;
  postKind?: 'discussion' | 'announcement' | 'visit_capture' | 'drop_in' | 'appointment_invite' | 'poll';
};

function formatCircleThreadPostPlain(post: CircleThreadPostClipboardInput): string {
  const time = new Date(post.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${post.authorName} — ${time}\n\n${post.text.trim()}`;
}

export async function writeCircleThreadPostToClipboard(
  post: CircleThreadPostClipboardInput,
  options?: { recordedByDisplayName?: string },
): Promise<void> {
  if (isVisitCaptureThreadPost(post)) {
    await writeVisitCaptureToClipboard(post.text, options?.recordedByDisplayName);
    return;
  }

  await writeFormattedTextToClipboard(formatCircleThreadPostPlain(post));
}
