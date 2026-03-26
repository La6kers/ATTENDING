import { useState, useEffect, useRef } from 'react';

/**
 * IntakeProgressBar -- accessible, mobile-first progress indicator for COMPASS intake.
 *
 * Features:
 * - Numbered step dots with labels (responsive: labels hidden on very small screens)
 * - Animated fill bar connecting the dots
 * - Adaptive time estimate display
 * - Encouraging micro-copy per step
 * - ARIA live region for screen reader announcements
 * - Color-blind safe: uses shape + number + pattern, not color alone
 *
 * Props:
 *   currentStep     - 0-based step index (0 = welcome, 5 = complete)
 *   timeRemaining   - human-readable time label, e.g. "About 2 minutes left"
 *   percentComplete - 0-100
 */

const STEP_META = [
  { label: 'Welcome',      short: 'Start',    icon: WaveIcon,     micro: 'Let\'s get started -- this will be quick.' },
  { label: 'Demographics',  short: 'Info',     icon: PersonIcon,   micro: 'Just the basics so we know who you are.' },
  { label: 'Symptoms',      short: 'Symptoms', icon: HeartIcon,    micro: 'Tell us what\'s going on in your own words.' },
  { label: 'Follow-Up',     short: 'Details',  icon: ChatIcon,     micro: 'A few quick questions to help your doctor prepare.' },
  { label: 'Vitals',        short: 'Vitals',   icon: PulseIcon,    micro: 'Almost there -- just a few measurements.' },
  { label: 'Complete',      short: 'Done',     icon: CheckIcon,    micro: 'All done! Your doctor is getting ready for you.' },
];

export default function IntakeProgressBar({ currentStep, timeRemaining, percentComplete }) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const announcementRef = useRef(null);

  // Animate the progress bar width
  useEffect(() => {
    // Small delay so the CSS transition fires
    const frame = requestAnimationFrame(() => {
      setAnimatedPercent(percentComplete);
    });
    return () => cancelAnimationFrame(frame);
  }, [percentComplete]);

  // Announce step changes to screen readers
  useEffect(() => {
    if (announcementRef.current) {
      const meta = STEP_META[currentStep];
      announcementRef.current.textContent =
        `Step ${currentStep + 1} of 6: ${meta.label}. ${timeRemaining}.`;
    }
  }, [currentStep, timeRemaining]);

  // Don't render the full bar on welcome or complete
  if (currentStep === 0 || currentStep === 5) {
    return null;
  }

  // Active steps for the dots: indices 1-4 (demographics through vitals)
  const activeSteps = STEP_META.slice(1, 5);
  const activeIndex = currentStep - 1; // 0-based among active steps

  return (
    <div className="w-full" role="navigation" aria-label="Intake progress">
      {/* Screen reader live region */}
      <div
        ref={announcementRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Main progress container */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Step dots with connecting bar */}
        <div className="relative flex items-center justify-between">
          {/* Background track */}
          <div
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full"
            aria-hidden="true"
          />
          {/* Filled track */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-compass-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, (activeIndex / (activeSteps.length - 1)) * 100)}%` }}
            aria-hidden="true"
          />

          {/* Step dots */}
          {activeSteps.map((meta, i) => {
            const isCompleted = i < activeIndex;
            const isCurrent = i === activeIndex;
            const isFuture = i > activeIndex;
            const StepIcon = meta.icon;

            return (
              <div
                key={meta.label}
                className="relative z-10 flex flex-col items-center"
              >
                {/* Dot */}
                <div
                  className={`
                    flex items-center justify-center rounded-full
                    transition-all duration-300 ease-out
                    ${isCompleted
                      ? 'w-8 h-8 sm:w-9 sm:h-9 bg-compass-500 text-white ring-2 ring-compass-200'
                      : isCurrent
                        ? 'w-10 h-10 sm:w-11 sm:h-11 bg-compass-600 text-white ring-4 ring-compass-200 shadow-lg shadow-compass-200'
                        : 'w-8 h-8 sm:w-9 sm:h-9 bg-white text-gray-400 border-2 border-gray-300'
                    }
                  `}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <CheckSmallIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold" aria-hidden="true">
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Label -- hidden on very small screens, abbreviated on small, full on medium+ */}
                <span
                  className={`
                    mt-1.5 text-center text-[10px] sm:text-xs font-medium leading-tight
                    transition-colors duration-300
                    hidden xs:block
                    ${isCurrent ? 'text-compass-700' : isCompleted ? 'text-compass-600' : 'text-gray-400'}
                  `}
                >
                  <span className="sm:hidden">{meta.short}</span>
                  <span className="hidden sm:inline">{meta.label}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Time estimate + micro-copy */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
          {/* Micro-copy */}
          <p
            className="text-sm text-gray-600 transition-opacity duration-300 intake-fade-in"
            key={currentStep} // forces re-mount for fade animation
          >
            {STEP_META[currentStep]?.micro}
          </p>

          {/* Time estimate pill */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-compass-50 text-compass-700 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0"
            aria-label={timeRemaining}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>{timeRemaining}</span>
          </div>
        </div>

        {/* ARIA progress bar (semantic, not visible) */}
        <div
          role="progressbar"
          aria-valuenow={percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Intake progress: ${percentComplete}% complete. ${timeRemaining}`}
          className="sr-only"
        />
      </div>
    </div>
  );
}


// --- Inline SVG icons (small, tree-shakeable, no external dependency) ---

function WaveIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075-5.925v3m0-3a1.575 1.575 0 0 1 3.15 0m-3.15 0v4.5m3.15-4.5v6m0 0v.75m0-.75a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.3 6.3 0 0 0 6.3 6.3h2.1a6.3 6.3 0 0 0 6.3-6.3V9.15" />
    </svg>
  );
}

function PersonIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
    </svg>
  );
}

function HeartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function ChatIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function PulseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l3-9 4 18 3-9h5" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function CheckSmallIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
