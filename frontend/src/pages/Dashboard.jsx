// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// components (assumes these exist)
import SmallMultiples from "../sections/SmallMultiples";
import WeeklyActivityRing from "../sections/WeeklyActivityRing";

// Use the uploaded design file path (the environment will serve it).
const LOGO_URL = "/mnt/data/Screenshot 2025-11-23 211923.png";

const COLORS = {
  plastic: "#10B981",
  plastic2: "#06B6D4",
  paper: "#F97316",
  general: "#6366F1",
  other2: "#8B5CF6",
};

function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

/**
 * Build chart rows. Accepts groups (ISO strings) and optionally groupsMillis (array of epoch ms).
 * Each returned row will include:
 * - group: the ISO string label (used as key)
 * - __ms: optional epoch ms (if groupsMillis provided)
 * - <category keys>: numeric counts
 * - total: sum across categories
 */
function transformStatsToChartData(groups = [], series = {}, groupsMillis = []) {
  return groups.map((g, idx) => {
    const row = { group: g };
    if (groupsMillis && groupsMillis[idx] != null) row.__ms = groupsMillis[idx];
    let total = 0;
    Object.keys(series).forEach((cat) => {
      const arr = series[cat] || [];
      const v = arr[idx] ?? 0;
      row[cat] = v;
      total += v;
    });
    row.total = total;
    return row;
  });
}

function getOrderedCategories(keys = []) {
  const lower = (s) => (s || "").toLowerCase();
  const plastics = keys.filter((k) =>
    ["plastic", "plastic_cup", "plastic_bottle", "straw", "cup", "bottle"].some(
      (p) => lower(k).includes(p)
    )
  );
  const papers = keys.filter((k) =>
    ["paper", "bag", "tissue", "napkin", "serviette", "book"].some((p) =>
      lower(k).includes(p)
    )
  );
  const general = keys.filter((k) => lower(k).includes("general"));
  const rest = keys
    .filter((k) => !plastics.includes(k) && !papers.includes(k) && !general.includes(k))
    .sort();
  return [...new Set([...plastics, ...papers, ...general, ...rest])];
}

function computeCompositionFromSeries(series = {}) {
  const totals = {};
  const keys = Object.keys(series);
  let grand = 0;
  keys.forEach((k) => {
    const arr = series[k] || [];
    const last = arr.length ? arr[arr.length - 1] : 0;
    totals[k] = last;
    grand += last;
  });
  return { totals, grand };
}

const categoryColor = (cat) => {
  const lc = (cat || "").toLowerCase();
  if (lc.includes("plastic")) return COLORS.plastic;
  if (lc.includes("bottle") || lc.includes("cup") || lc.includes("straw")) return COLORS.plastic2;
  if (lc.includes("paper") || lc.includes("bag") || lc.includes("tissue") || lc.includes("napkin"))
    return COLORS.paper;
  if (lc.includes("general")) return COLORS.general;
  return COLORS.other2;
};

/* ======= Time parsing helpers (robust) =======
   parseGroupToDayjs accepts:
   - epoch ms (number)
   - ISO strings with Z or offset
   - ISO-like strings without offset (e.g. "2025-11-26T19:00:00") -> treat as UTC
*/
const parseGroupToDayjs = (groupStrOrMs) => {
  if (groupStrOrMs == null) return null;

  // If it's a number (ms), parse directly
  if (typeof groupStrOrMs === "number") {
    const d = dayjs(groupStrOrMs);
    return d.isValid() ? d : null;
  }

  // If it is numeric string representing ms
  if (/^[0-9]+$/.test(groupStrOrMs)) {
    const d = dayjs(Number(groupStrOrMs));
    return d.isValid() ? d : null;
  }

  // If it's a string ISO-like:
  // If contains 'T' but no timezone offset or Z -> append 'Z' to treat as UTC.
  const hasTime = groupStrOrMs.includes("T");
  const hasTZ = /Z|[+\-]\d{2}:?\d{2}/.test(groupStrOrMs);
  const toParse = hasTime && !hasTZ ? $`{groupStrOrMs}Z` : groupStrOrMs;
  const d = dayjs(toParse);
  return d.isValid() ? d : null;
};

const tickFormatter = (val, groupBy) => {
  const d = parseGroupToDayjs(val);
  if (!d) return val;
  if (groupBy === "hour") return d.format("MMM D HH:00");
  if (groupBy === "month") return d.format("MMM YYYY");
  return d.format("MMM D");
};
/* ============================================ */

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(null);

  // main chart data
  const [groups, setGroups] = useState([]); // array of ISO strings (for keys)
  const [groupsMillis, setGroupsMillis] = useState([]); // optional epoch ms
  const [series, setSeries] = useState({});

  // composition
  const [compositionTotals, setCompositionTotals] = useState({});
  const [compositionGrand, setCompositionGrand] = useState(0);

  // UI controls
  const [rangeDays, setRangeDays] = useState(7);
  const [groupBy, setGroupBy] = useState("day");
  const [error, setError] = useState(null);

  const chartData = useMemo(
    () => transformStatsToChartData(groups, series, groupsMillis),
    [groups, series, groupsMillis]
  );
  const categories = useMemo(() => getOrderedCategories(Object.keys(series)), [series]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      try {
        const evtPromise = api.get("/events?page=1&limit=1");
        const endMain = dayjs().endOf("day").toISOString();
        const startMain = dayjs().subtract(rangeDays - 1, "day").startOf("day").toISOString();
        const statsMainPromise = api.get(
          `/stats?groupBy=${groupBy}&rangeStart=${encodeURIComponent(startMain)}&rangeEnd=${encodeURIComponent(
            endMain
          )}`
        );

        const [evtResp, statsMainResp] = await Promise.all([evtPromise, statsMainPromise]);

        if (!mounted) return;

        const total = evtResp?.data?.total ?? null;
        setTotalEvents(total);

        const statsMain = statsMainResp?.data || {};

        // Prefer groupsMillis (epoch ms) if returned by backend (most robust)
        if (Array.isArray(statsMain.groupsMillis) && statsMain.groupsMillis.length) {
          const millis = statsMain.groupsMillis.map((m) => Number(m));
          // derive ISO strings from ms for group key labels (ISO in UTC)
          const isoGroups = millis.map((ms) => new Date(ms).toISOString());
          setGroups(isoGroups);
          setGroupsMillis(millis);
        } else {
          // fallback: server returned groups as ISO strings
          setGroups(Array.isArray(statsMain.groups) ? statsMain.groups : []);
          setGroupsMillis([]);
        }

        setSeries(statsMain.series || {});

        const { totals, grand } = computeCompositionFromSeries(statsMain.series || {});
        setCompositionTotals(totals);
        setCompositionGrand(grand);

        setLoading(false);
      } catch (err) {
        console.error("Dashboard fetch error", err);
        if (!mounted) return;
        setError("Failed to load metrics");
        toast.error("Failed to load dashboard metrics");
        setLoading(false);
      }
    };

    fetchAll();

    const id = setInterval(fetchAll, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [rangeDays, groupBy]);

  // pie data for composition
  const pieData = useMemo(() => {
    const keys = Object.keys(compositionTotals || {});
    if (!keys.length) return [];
    return keys.map((k) => ({ name: k, value: compositionTotals[k] || 0 }));
  }, [compositionTotals]);

  // daily counts derived from groups+series (used by ring)
  const dailyCountsFromSeries = useMemo(() => {
    return groups.map((g, idx) => {
      const total = Object.keys(series || {}).reduce(
        (acc, k) => acc + ((series[k] && series[k][idx]) || 0),
        0
      );
      // date: prefer epoch ms if available for unambiguous instant, else ISO string
      const date = groupsMillis && groupsMillis[idx] != null ? groupsMillis[idx] : g;
      return { date, count: total };
    });
  }, [groups, series, groupsMillis]);

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg shadow-sm text-sm text-gray-600">Range:</div>
          <div className="flex gap-2">
            <button
              onClick={() => setRangeDays(7)}
              className={`px-3 py-1 rounded-lg ${
                rangeDays === 7 ? "bg-emerald-600 text-white" : "bg-white text-gray-700 shadow-sm"
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setRangeDays(30)}
              className={`px-3 py-1 rounded-lg ${
                rangeDays === 30 ? "bg-emerald-600 text-white" : "bg-white text-gray-700 shadow-sm"
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setRangeDays(90)}
              className={`px-3 py-1 rounded-lg ${
                rangeDays === 90 ? "bg-emerald-600 text-white" : "bg-white text-gray-700 shadow-sm"
              }`}
            >
              90d
            </button>
          </div>

          <div className="ml-4 bg-white p-2 rounded-lg shadow-sm">
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="bg-transparent outline-none text-sm">
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-white shadow-sm">
          <div>
            <div className="text-sm text-gray-500">Total Events</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{loading ? "..." : formatNumber(totalEvents)}</div>
            <div className="mt-2 text-xs text-gray-400">All-time</div>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white shadow-sm">
          <div>
            <div className="text-sm text-gray-500">Plastics (Today)</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">
              {loading
                ? "..."
                : formatNumber(
                    Object.keys(compositionTotals).reduce((acc, k) => {
                      if (
                        k.toLowerCase().includes("plastic") ||
                        k.toLowerCase().includes("cup") ||
                        k.toLowerCase().includes("bottle") ||
                        k.toLowerCase().includes("straw")
                      ) {
                        return acc + (compositionTotals[k] || 0);
                      }
                      return acc;
                    }, 0)
                  )}
            </div>
            <div className="mt-2 text-xs text-gray-400">Includes cups, bottles, straws</div>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white shadow-sm">
          <div>
            <div className="text-sm text-gray-500">Paper (Today)</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {loading
                ? "..."
                : formatNumber(
                    Object.keys(compositionTotals).reduce((acc, k) => {
                      if (["paper", "bag", "tissue", "napkin", "serviette", "book"].some((w) => k.toLowerCase().includes(w))) {
                        return acc + (compositionTotals[k] || 0);
                      }
                      return acc;
                    }, 0)
                  )}
            </div>
            <div className="mt-2 text-xs text-gray-400">Includes bags, napkins, book paper</div>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white shadow-sm">
          <div>
            <div className="text-sm text-gray-500">General (Today)</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {loading
                ? "..."
                : formatNumber(
                    Math.max(
                      0,
                      compositionGrand -
                        Object.keys(compositionTotals).reduce((acc, k) => {
                          if (
                            k.toLowerCase().includes("plastic") ||
                            ["paper", "bag", "tissue", "napkin", "serviette", "book"].some((w) => k.toLowerCase().includes(w))
                          ) {
                            return acc + (compositionTotals[k] || 0);
                          }
                          return acc;
                        }, 0)
                    )
                  )}
            </div>
            <div className="mt-2 text-xs text-gray-400">All other items</div>
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-white p-4 rounded-2xl shadow-sm min-h-[340px]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-500">Trend (Last {rangeDays} days)</div>
          <div className="text-xs text-gray-400">Group: {groupBy}</div>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-gray-400">Loading chart...</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={8} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="group"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => tickFormatter(v, groupBy)}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  // payload[0].payload is the row object we created; it may include __ms
                  const row = payload[0]?.payload;
                  const tsSource = row?._ms != null ? row._ms : label;
                  const d = parseGroupToDayjs(tsSource);
                  return (
                    <div className="bg-white p-2 rounded shadow-sm" style={{ minWidth: 170 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        {d
                          ? groupBy === "hour"
                            ? d.format("YYYY-MM-DD HH:00")
                            : groupBy === "month"
                            ? d.format("YYYY-MM")
                            : d.format("YYYY-MM-DD")
                          : label}
                      </div>
                      {payload.map((p) => (
                        <div key={p.dataKey} style={{ color: p.fill, fontSize: 13, marginBottom: 4 }}>
                          {p.name || p.dataKey} : {p.value}
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend />
              {categories.map((cat) => (
                <Bar key={cat} dataKey={cat} fill={categoryColor(cat)} />
              ))}

              <Line type="monotone" dataKey="total" stroke="#111827" dot={false} strokeWidth={2} name="total" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Composition + Weekly ring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm min-h-[220px]">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-gray-500">Composition (Latest)</div>
            <div className="text-xs text-gray-400">Total: {compositionGrand}</div>
          </div>

          <div className="composition-pie-wrapper flex gap-6">
            <div style={{ width: 300, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={6}
                    labelLine={false}
                    label={({ percent }) => `${Math.round(percent * 100)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="composition-legend flex-1">
              <div className="space-y-3">
                {pieData.length === 0 && <div className="text-sm text-gray-400">No data</div>}
                {pieData.map((p) => (
                  <div key={p.name} className="legend-item flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 12, height: 12, backgroundColor: categoryColor(p.name) }} className="rounded" />
                      <div className="text-sm text-gray-700 capitalize">{p.name}</div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm min-h-[220px] flex items-center justify-center">
          <WeeklyActivityRing dailyCounts={dailyCountsFromSeries} size={180} />
        </div>
      </div>

      {/* Small multiples */}
      <div className="mt-4">
        <div className="text-sm text-gray-500 mb-2">Per-class mini trends</div>
        <SmallMultiples groups={groups} series={series} maxItems={6} />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}