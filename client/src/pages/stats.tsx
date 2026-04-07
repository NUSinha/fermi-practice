import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatsData {
  totalAttempts: number;
  avgError: number;
  accuracy: number;
  byCategory: Record<string, { count: number; avgError: number }>;
  byDifficulty: Record<string, { count: number; avgError: number }>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  testId?: string;
}

function KpiCard({ label, value, subLabel, testId }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-1" data-testid={testId}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-foreground font-mono">{value}</div>
      {subLabel && <div className="text-xs text-muted-foreground">{subLabel}</div>}
    </div>
  );
}

// ─── Error Color ──────────────────────────────────────────────────────────────

function errorColor(avgError: number): string {
  if (avgError <= 1) return "#4f46e5";   // indigo — excellent
  if (avgError <= 2) return "#818cf8";   // indigo lighter — good
  if (avgError <= 3) return "#d97706";   // amber — improving
  return "#dc2626";                      // red — needs work
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-foreground mb-1">{label}</div>
      <div className="text-muted-foreground">
        Attempts: <span className="font-mono text-foreground">{d.count}</span>
      </div>
      <div className="text-muted-foreground">
        Avg error: <span className="font-mono text-foreground">{d.avgError.toFixed(2)}</span> orders
      </div>
    </div>
  );
}

// ─── Stats Page ───────────────────────────────────────────────────────────────

export default function Stats() {
  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const categoryData = stats
    ? Object.entries(stats.byCategory).map(([name, val]) => ({
        name,
        count: val.count,
        avgError: val.avgError,
      }))
    : [];

  const difficultyOrder = ["easy", "medium", "hard"];
  const difficultyData = stats
    ? Object.entries(stats.byDifficulty)
        .map(([name, val]) => ({
          name,
          count: val.count,
          avgError: val.avgError,
        }))
        .sort(
          (a, b) =>
            (difficultyOrder.indexOf(a.name.toLowerCase()) ?? 99) -
            (difficultyOrder.indexOf(b.name.toLowerCase()) ?? 99)
        )
    : [];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8" data-testid="stats-page">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Practice Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your estimation performance across all sessions.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {statsLoading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : stats ? (
          <>
            <KpiCard
              label="Problems attempted"
              value={stats.totalAttempts.toLocaleString()}
              testId="kpi-total-attempts"
            />
            <KpiCard
              label="Average error"
              value={`${stats.avgError.toFixed(1)} orders`}
              subLabel="lower is better"
              testId="kpi-avg-error"
            />
            <KpiCard
              label="Accuracy"
              value={`${Math.round(stats.accuracy)}%`}
              subLabel="within 1 order of magnitude"
              testId="kpi-accuracy"
            />
          </>
        ) : (
          <div className="col-span-3 text-sm text-muted-foreground">
            No data yet. Start practicing to see stats.
          </div>
        )}
      </div>

      {stats && stats.totalAttempts > 0 && (
        <div className="space-y-6">
          {/* Category Chart */}
          {categoryData.length > 0 && (
            <div className="rounded-lg border border-border p-5" data-testid="chart-by-category">
              <div className="text-xs font-medium text-muted-foreground mb-4">Error by category</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={categoryData}
                  margin={{ top: 8, right: 8, left: -20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#71717a" }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgError" radius={[3, 3, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={errorColor(entry.avgError)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Difficulty Chart */}
          {difficultyData.length > 0 && (
            <div className="rounded-lg border border-border p-5" data-testid="chart-by-difficulty">
              <div className="text-xs font-medium text-muted-foreground mb-4">Error by difficulty</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={difficultyData}
                  margin={{ top: 8, right: 8, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717a" }} domain={[0, "auto"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgError" radius={[3, 3, 0, 0]}>
                    {difficultyData.map((entry, index) => (
                      <Cell key={index} fill={errorColor(entry.avgError)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-indigo-600" />
              ≤ 1 order (excellent)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-indigo-400" />
              ≤ 2 orders (good)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-amber-600" />
              ≤ 3 orders (improving)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block bg-red-600" />
              &gt; 3 orders (needs work)
            </span>
          </div>
        </div>
      )}

      {stats && stats.totalAttempts === 0 && (
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
          <p className="font-medium text-foreground mb-1">No attempts yet</p>
          <p>Head to the Practice page and answer some questions to see your stats here.</p>
        </div>
      )}
    </div>
  );
}
