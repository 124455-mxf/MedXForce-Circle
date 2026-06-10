import { isVisitCaptureThreadPost } from '@medxforce/shared';
import { writeVisitCaptureToClipboard } from './visitCaptureClipboard';

type CircleThreadPostClipboardInput = {
  text: string;
  authorName: string;
  createdAt: number;
  postKind?: 'visit_capture';
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
): Promise<void> {
  if (isVisitCaptureThreadPost(post)) {
    await writeVisitCaptureToClipboard(post.text);
    return;
  }

  await navigator.clipboard.writeText(formatCircleThreadPostPlain(post));
}
