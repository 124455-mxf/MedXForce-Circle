import { RotateCw } from 'lucide-react';
import { MedXForceBrandLogo } from './MedXForceBrandLogo';

type CirclePortraitRequiredOverlayProps = {
  title: string;
  message: string;
};

export function CirclePortraitRequiredOverlay({
  title,
  message,
}: CirclePortraitRequiredOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 px-6 py-10 text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="circle-portrait-title"
      aria-describedby="circle-portrait-message"
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg">
          <MedXForceBrandLogo />
        </div>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
          <RotateCw
            size={40}
            className="text-white/90 animate-[spin_3s_linear_infinite]"
            aria-hidden
          />
        </div>
        <div className="space-y-3">
          <h1 id="circle-portrait-title" className="text-2xl font-bold text-white">
            {title}
          </h1>
          <p id="circle-portrait-message" className="text-sm leading-relaxed text-white/80">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
