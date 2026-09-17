import { CircleFormattedBody } from './CircleFormattedBody';

/** Renders AI guidance as readable UI (not raw markdown asterisks). */
export function CircleAiGuidanceContent({ text }: { text: string }) {
  return <CircleFormattedBody text={text} className="text-sm text-slate-700" />;
}
