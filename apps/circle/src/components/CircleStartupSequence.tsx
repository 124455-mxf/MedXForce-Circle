import type { CircleStartupPhase } from '../hooks/useCircleStartupSequence';

/** Circle app brand splash color */
export const STARTUP_BRAND_COLOR = '#F9A142';

const STEPS = [
  'Starting MedXForce Circle',
  'Loading your circle',
  'Preparing your messages',
] as const;

type CircleStartupSequenceProps = {
  phase: CircleStartupPhase;
  exiting: boolean;
};

export function CircleStartupSequence({ phase, exiting }: CircleStartupSequenceProps) {
  const progress = ((phase + 1) / STEPS.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[10000] overflow-hidden text-white transition-opacity duration-500 ease-in-out"
      style={{
        backgroundColor: STARTUP_BRAND_COLOR,
        opacity: exiting ? 0 : 1,
      }}
      aria-live="polite"
      aria-busy={!exiting}
      role="status"
    >
      <div
        className="flex h-full min-h-[100dvh] w-full flex-col"
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
        }}
      >
        <header className="shrink-0 pt-[clamp(0.5rem,2vh,1.5rem)] text-center landscape:pt-[clamp(0.25rem,1.5vh,1rem)]">
          <p className="mx-auto max-w-2xl text-[clamp(0.625rem,1.8vw,0.9375rem)] font-medium leading-snug text-white/95">
            MedXForce Circle — friends &amp; family
          </p>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(1rem,4vw,2.5rem)] text-center transition-opacity duration-500 ease-out">
          <div className="w-full max-w-4xl">
            <h1
              className="font-bold leading-none tracking-tight text-white"
              style={{ fontSize: 'clamp(2.75rem, 11vw, 5.5rem)' }}
            >
              MedXForce
            </h1>
            <p
              className="mx-auto mt-[clamp(0.75rem,2.5vh,1.5rem)] max-w-xl font-semibold uppercase tracking-[0.28em] text-white/95 landscape:mt-[clamp(0.5rem,1.5vh,1rem)]"
              style={{ fontSize: 'clamp(0.6875rem, 2vw, 1.0625rem)' }}
            >
              Communication made possible
            </p>
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[min(100%,22rem)] shrink-0 pb-[clamp(0.5rem,2vh,1.25rem)] landscape:max-w-[min(100%,28rem)]">
          <div className="mb-3 h-[1.125rem] landscape:mb-2">
            <p
              key={STEPS[phase]}
              className="text-center text-[clamp(0.625rem,1.6vw,0.8125rem)] font-bold uppercase tracking-[0.22em] text-white/90 transition-opacity duration-300"
            >
              {STEPS[phase]}
            </p>
          </div>

          <div
            className="h-[3px] w-full overflow-hidden rounded-full bg-white/35 landscape:h-[4px]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-300 via-blue-400 to-white transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(6, progress)}%` }}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}
