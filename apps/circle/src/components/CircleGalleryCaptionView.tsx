import { useState } from 'react';

const CAPTION_PREVIEW_CHARS = 100;

type CircleGalleryCaptionViewProps = {
  caption: string;
};

export function CircleGalleryCaptionView({ caption }: CircleGalleryCaptionViewProps) {
  const [expanded, setExpanded] = useState(false);
  const text = caption.trim();
  if (!text) return null;

  const needsTruncate = text.length > CAPTION_PREVIEW_CHARS;
  const displayText =
    expanded || !needsTruncate
      ? text
      : `${text.slice(0, CAPTION_PREVIEW_CHARS).trimEnd()}…`;

  return (
    <p className="text-sm font-medium leading-relaxed text-slate-800">
      {displayText}
      {needsTruncate ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-blue-600 font-bold ml-1 whitespace-nowrap hover:underline pointer-events-auto"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </p>
  );
}
