import { cn } from "@/lib/utils";

interface NumberLineProps {
  userExponent: number;
  correctExponent: number;
  className?: string;
}

const RANGE_MIN = -3;
const RANGE_MAX = 16;
const RANGE = RANGE_MAX - RANGE_MIN;

// All labels as exponents
const TICK_CONFIG = [
  { exp: -3, label: "10⁻³", major: true },
  { exp: -2, label: null, major: false },
  { exp: -1, label: null, major: false },
  { exp: 0,  label: "10⁰",  major: true },
  { exp: 1,  label: null, major: false },
  { exp: 2,  label: null, major: false },
  { exp: 3,  label: "10³",  major: true },
  { exp: 4,  label: null, major: false },
  { exp: 5,  label: null, major: false },
  { exp: 6,  label: "10⁶",  major: true },
  { exp: 7,  label: null, major: false },
  { exp: 8,  label: null, major: false },
  { exp: 9,  label: "10⁹",  major: true },
  { exp: 10, label: null, major: false },
  { exp: 11, label: null, major: false },
  { exp: 12, label: "10¹²", major: true },
  { exp: 13, label: null, major: false },
  { exp: 14, label: null, major: false },
  { exp: 15, label: "10¹⁵", major: true },
  { exp: 16, label: null, major: false },
];

function exponentToPercent(exp: number): number {
  return ((exp - RANGE_MIN) / RANGE) * 100;
}

export function NumberLine({ userExponent, correctExponent, className }: NumberLineProps) {
  const userPct = Math.max(0, Math.min(100, exponentToPercent(userExponent)));
  const correctPct = Math.max(0, Math.min(100, exponentToPercent(correctExponent)));

  const majorTicks = TICK_CONFIG.filter((t) => t.major);
  const minorTicks = TICK_CONFIG.filter((t) => !t.major);

  // Determine which marker is on top (draw lower marker first)
  const userOnTop = Math.abs(userPct - 50) <= Math.abs(correctPct - 50);

  return (
    <div className={cn("select-none", className)} data-testid="number-line">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          Your answer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
          Correct answer
        </span>
      </div>

      {/* Track */}
      <div className="relative mt-6 mb-8 mx-3">
        {/* Background line */}
        <div className="h-[3px] rounded-full bg-gray-200 relative" />

        {/* Colored fill between markers */}
        {userPct !== correctPct && (
          <div
            className="absolute top-0 h-[3px] rounded-full bg-indigo-100"
            style={{
              left: `${Math.min(userPct, correctPct)}%`,
              width: `${Math.abs(userPct - correctPct)}%`,
            }}
          />
        )}

        {/* Minor ticks */}
        {minorTicks.map((t) => (
          <div
            key={t.exp}
            className="absolute top-0 -translate-x-px w-px h-[3px] bg-gray-300"
            style={{ left: `${exponentToPercent(t.exp)}%` }}
          />
        ))}

        {/* Major ticks + labels */}
        {majorTicks.map((t) => (
          <div
            key={t.exp}
            className="absolute flex flex-col items-center"
            style={{ left: `${exponentToPercent(t.exp)}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-px h-3 -mt-[1px] bg-gray-400" />
            {t.label && (
              <span className="text-[10px] mt-1.5 whitespace-nowrap text-muted-foreground">
                {t.label}
              </span>
            )}
          </div>
        ))}

        {/* Markers — render back one first, front one second */}
        {[!userOnTop, userOnTop].map((isUser, i) => {
          if (isUser === undefined) return null;
          const pct = isUser ? userPct : correctPct;
          const exp = isUser ? userExponent : correctExponent;
          const isUserMarker = isUser;
          const zIndex = i === 0 ? 10 : 20;

          return (
            <div
              key={isUserMarker ? "user" : "correct"}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out"
              style={{ left: `${pct}%`, zIndex }}
              data-testid={isUserMarker ? "number-line-user-marker" : "number-line-correct-marker"}
            >
              {/* Dot */}
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 border-white shadow-md",
                  isUserMarker ? "bg-rose-500" : "bg-indigo-600"
                )}
              />
              {/* Label */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap",
                  isUserMarker
                    ? "-top-7 text-rose-600"
                    : "-bottom-7 text-indigo-700"
                )}
              >
                10<sup>{exp}</sup>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
