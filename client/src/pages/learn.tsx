import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Interactive Number Line ─────────────────────────────────────────────────

interface ReferencePoint {
  exp: number;
  label: string;
  description: string;
}

const REFERENCE_POINTS: ReferencePoint[] = [
  { exp: 0,  label: "10⁰ = 1",    description: "One human" },
  { exp: 1,  label: "10¹ = 10",   description: "Fingers on your hands" },
  { exp: 2,  label: "10² = 100",  description: "People in a lecture hall" },
  { exp: 3,  label: "10³ = 1K",   description: "Students in a school" },
  { exp: 4,  label: "10⁴ = 10K",  description: "Seats in a stadium section" },
  { exp: 5,  label: "10⁵ = 100K", description: "Spectators at a big event" },
  { exp: 6,  label: "10⁶ = 1M",   description: "Grains of sand in a handful" },
  { exp: 7,  label: "10⁷ = 10M",  description: "Population of NYC" },
  { exp: 8,  label: "10⁸ = 100M", description: "Population of a large country" },
  { exp: 9,  label: "10⁹ = 1B",   description: "Seconds in ~30 years" },
  { exp: 10, label: "10¹⁰ = 10B", description: "Humans ever born on Earth" },
  { exp: 11, label: "10¹¹ = 100B",description: "Stars in the Milky Way" },
  { exp: 12, label: "10¹² = 1T",  description: "Cells in the human body" },
];

function LearnNumberLine() {
  return (
    <div className="overflow-x-auto pb-2" data-testid="learn-number-line">
      <div className="min-w-[600px] px-2">
        {/* Track */}
        <div className="relative h-2 bg-border rounded-full mb-8 mt-4">
          {REFERENCE_POINTS.map((pt) => {
            const pct = (pt.exp / 12) * 100;
            return (
              <div
                key={pt.exp}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                style={{ left: `${pct}%` }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white cursor-pointer transition-transform group-hover:scale-150" />
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-border rounded px-2 py-1 shadow-sm z-10 whitespace-nowrap text-xs pointer-events-none">
                  <div className="font-semibold text-foreground font-mono">{pt.label}</div>
                  <div className="text-muted-foreground">{pt.description}</div>
                </div>
                {pt.exp % 3 === 0 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                    {pt.label.split(" = ")[1]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-1 mt-8">
          {REFERENCE_POINTS.map((pt) => (
            <div key={pt.exp} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50 transition-colors">
              <span className="font-medium w-14 shrink-0 text-foreground font-mono">
                {pt.label.split(" = ")[0]}
              </span>
              <span className="text-muted-foreground">{pt.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Worked Example ──────────────────────────────────────────────────────────

interface WorkedStep {
  factor: string;
  estimate: string;
  note?: string;
}

interface WorkedExampleProps {
  title: string;
  question: string;
  steps: WorkedStep[];
  answer: string;
  answerExp: number;
}

function WorkedExample({ title, question, steps, answer, answerExp }: WorkedExampleProps) {
  return (
    <div className="rounded-lg border border-border p-5 space-y-3">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">{title}</div>
        <p className="font-medium text-sm text-foreground">{question}</p>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-muted text-foreground text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="text-sm">
              <span className="font-medium text-foreground">{step.factor}: </span>
              <span className="text-foreground font-mono">{step.estimate}</span>
              {step.note && (
                <span className="text-muted-foreground ml-1">({step.note})</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Answer:</span>
        <span className="font-medium text-foreground text-sm font-mono">
          ≈ {answer}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">
          10^{answerExp}
        </span>
      </div>
    </div>
  );
}

// ─── Learn Page ──────────────────────────────────────────────────────────────

export default function Learn() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8" data-testid="learn-page">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Estimation Curriculum</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Three modules to build your Fermi estimation intuition.
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["module-1"]} className="space-y-2">
        {/* Module 1 */}
        <AccordionItem value="module-1" className="rounded-lg border border-border overflow-hidden">
          <AccordionTrigger
            className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors"
            data-testid="accordion-module-1"
          >
            <div className="flex items-center gap-3 text-left">
              <span className="w-6 h-6 rounded bg-indigo-600 text-white font-medium text-xs flex items-center justify-center flex-shrink-0">
                1
              </span>
              <div>
                <div className="font-medium text-foreground text-sm">Philosophy of Estimation</div>
                <div className="text-xs text-muted-foreground font-normal mt-0.5">
                  Why approximate knowledge is real knowledge
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-5 border-t border-border">
            <div className="pt-4 space-y-2">
              <h2 className="text-sm font-medium text-foreground">Approximate knowledge is real knowledge</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Knowing that the US has "about 300 million people" is genuine knowledge — it's
                enough to estimate the number of piano tuners, the annual US tax revenue, or the
                size of a supply chain. Precision is expensive. Approximation is fast, and for
                most real-world questions, "the right order of magnitude" is all you need.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">The powers-of-10 number line</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our intuition for large numbers is terrible — we struggle to distinguish a million
                from a billion. The fix: think in powers of 10. Hover over each point to see what
                it represents.
              </p>
              <LearnNumberLine />
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-foreground">Breaking binary epistemology</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Most people think in two modes: "I know this" or "I don't know this." Fermi
                estimation breaks this binary. You can always bracket a quantity between a lower
                and upper bound, even if you've never thought about it before. The goal is not
                certainty — it's calibrated uncertainty. Knowing you're within an order
                of magnitude is infinitely more useful than refusing to guess.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Module 2 */}
        <AccordionItem value="module-2" className="rounded-lg border border-border overflow-hidden">
          <AccordionTrigger
            className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors"
            data-testid="accordion-module-2"
          >
            <div className="flex items-center gap-3 text-left">
              <span className="w-6 h-6 rounded bg-indigo-600 text-white font-medium text-xs flex items-center justify-center flex-shrink-0">
                2
              </span>
              <div>
                <div className="font-medium text-foreground text-sm">Estimation Techniques</div>
                <div className="text-xs text-muted-foreground font-normal mt-0.5">
                  Five tools that cover 90% of Fermi problems
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-5 border-t border-border">
            <div className="pt-4 space-y-2">
              <h2 className="text-sm font-medium text-foreground">1. Estimation is choosing what to throw away</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The 2x rule: if a factor is less than 2x, ignore it. The US population is
                334 million — round it to 300 million (10^8.5) or even 10^8. Rounding by 10%
                changes the answer by 0.04 orders of magnitude. Focus your precision budget
                on factors that vary by 10x or more.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-foreground">2. Permission to round aggressively</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Round everything to the nearest power of 10. Examples: 7 days/week → 10.
                52 weeks/year → 50 ≈ 10^1.7 → use 10^2. This feels wrong but the errors
                cancel out across a long multiplication chain.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-foreground">3. Divide and conquer</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Break any question into 2–4 independent factors. The total is their product.
                "How many gas stations are in the US?" → (US population / people per car) x
                (fill-ups per year per car / cars per station capacity). Each factor
                is individually estimable.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-foreground">4. Three-Assumptions Protocol</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Before answering, list your three key assumptions. Star the weakest one.
                Then ask: "If I'm 2x wrong about this assumption, does my final answer change
                by more than 1 order of magnitude?" If yes — dig deeper on that one assumption.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">5. Approximate Geometric Mean (AGM)</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you know a lower and upper bound, estimate the answer as the geometric mean:
              </p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-center font-mono text-sm text-indigo-800">
                estimate = √(lower × upper)
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Example: "How many piano tuners in Chicago?" You know it's more than 10 and less
                than 10,000. AGM → √(10 × 10,000) = √100,000 ≈ 316 ≈ 10^2.5. The actual answer
                is around 300.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Module 3 */}
        <AccordionItem value="module-3" className="rounded-lg border border-border overflow-hidden">
          <AccordionTrigger
            className="px-5 py-4 hover:no-underline hover:bg-muted/50 transition-colors"
            data-testid="accordion-module-3"
          >
            <div className="flex items-center gap-3 text-left">
              <span className="w-6 h-6 rounded bg-indigo-600 text-white font-medium text-xs flex items-center justify-center flex-shrink-0">
                3
              </span>
              <div>
                <div className="font-medium text-foreground text-sm">Worked Examples</div>
                <div className="text-xs text-muted-foreground font-normal mt-0.5">
                  Full step-by-step solutions with commentary
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-4 border-t border-border">
            <div className="pt-4 space-y-4">
              <WorkedExample
                title="Classic Problem"
                question="How many piano tuners are in Chicago?"
                steps={[
                  { factor: "Chicago population", estimate: "3 × 10⁶", note: "about 3 million" },
                  { factor: "People per household", estimate: "2.5", note: "round to 3" },
                  { factor: "Households", estimate: "10⁶", note: "3M ÷ 3" },
                  { factor: "Fraction with piano", estimate: "1 in 20", note: "= 5×10⁴ pianos" },
                  { factor: "Tunings per piano/year", estimate: "1", note: "= 5×10⁴ tunings/year" },
                  { factor: "Tunings per tuner/day", estimate: "4", note: "~250 working days → 10³ per tuner/year" },
                  { factor: "Tuners needed", estimate: "50", note: "5×10⁴ ÷ 10³ = 50" },
                ]}
                answer="≈ 50 tuners"
                answerExp={2}
              />

              <WorkedExample
                title="Volume Problem"
                question="How many golf balls fit in a school bus?"
                steps={[
                  { factor: "Bus volume", estimate: "2.5m × 2m × 7m = 35 m³", note: "≈ 3×10⁴ liters" },
                  { factor: "Packing efficiency", estimate: "64%", note: "sphere packing constant" },
                  { factor: "Golf ball diameter", estimate: "4 cm", note: "volume ≈ 34 cm³" },
                  { factor: "Golf balls", estimate: "35 × 0.64 / 3×10⁻⁵", note: "≈ 750,000" },
                ]}
                answer="≈ 500,000"
                answerExp={6}
              />

              <WorkedExample
                title="Rate Problem"
                question="How many piano keys are pressed in the US each day?"
                steps={[
                  { factor: "US population", estimate: "3 × 10⁸" },
                  { factor: "Fraction who play piano", estimate: "1%", note: "= 3 × 10⁶ players" },
                  { factor: "Minutes played per day", estimate: "20 min/day avg" },
                  { factor: "Keys per minute", estimate: "60 notes/min" },
                  { factor: "Total keys/day", estimate: "3×10⁶ × 20 × 60 = 3.6×10⁹" },
                ]}
                answer="≈ 4 billion keystrokes"
                answerExp={10}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
