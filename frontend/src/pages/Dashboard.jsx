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

function transformStatsToChartData(groups = [], series = {}) {
	return groups.map((g, idx) => {
		const row = { group: g };
		Object.keys(series).forEach((cat) => {
			const arr = series[cat] || [];
			row[cat] = arr[idx] ?? 0;
		});
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
		.filter(
			(k) =>
				!plastics.includes(k) && !papers.includes(k) && !general.includes(k)
		)
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
	if (lc.includes("bottle") || lc.includes("cup") || lc.includes("straw"))
		return COLORS.plastic2;
	if (
		lc.includes("paper") ||
		lc.includes("bag") ||
		lc.includes("tissue") ||
		lc.includes("napkin")
	)
		return COLORS.paper;
	if (lc.includes("general")) return COLORS.general;
	return COLORS.other2;
};

export default function Dashboard() {
	const [loading, setLoading] = useState(true);
	const [totalEvents, setTotalEvents] = useState(null);

	// main chart data
	const [groups, setGroups] = useState([]);
	const [series, setSeries] = useState({});

	// composition
	const [compositionTotals, setCompositionTotals] = useState({});
	const [compositionGrand, setCompositionGrand] = useState(0);

	// UI controls
	const [rangeDays, setRangeDays] = useState(7);
	const [groupBy, setGroupBy] = useState("day");
	const [error, setError] = useState(null);

	const chartData = useMemo(
		() => transformStatsToChartData(groups, series),
		[groups, series]
	);
	const categories = useMemo(
		() => getOrderedCategories(Object.keys(series)),
		[series]
	);

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		setError(null);

		const fetchAll = async () => {
			try {
				const evtPromise = api.get("/events?page=1&limit=1");
				const endMain = dayjs().endOf("day").toISOString();
				const startMain = dayjs()
					.subtract(rangeDays - 1, "day")
					.startOf("day")
					.toISOString();
				const statsMainPromise = api.get(
					`/stats?groupBy=${groupBy}&rangeStart=${encodeURIComponent(
						startMain
					)}&rangeEnd=${encodeURIComponent(endMain)}`
				);

				const [evtResp, statsMainResp] = await Promise.all([
					evtPromise,
					statsMainPromise,
				]);

				if (!mounted) return;

				const total = evtResp?.data?.total ?? null;
				setTotalEvents(total);

				const statsMain = statsMainResp?.data || {};
				const groupsMain = statsMain.groups || [];
				const seriesMain = statsMain.series || {};
				setGroups(groupsMain);
				setSeries(seriesMain);

				const { totals, grand } = computeCompositionFromSeries(seriesMain);
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
			return { date: g, count: total };
		});
	}, [groups, series]);

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				{/* <div className='flex items-center gap-4'>
					<img
						src={LOGO_URL}
						alt='logo'
						className='w-12 h-12 rounded-lg object-cover shadow-sm'
					/>
					<div>
						<h1 className='text-2xl font-semibold text-gray-900'>Dashboard</h1>
						<p className='text-sm text-gray-500'>
							Overview of recent waste classification activity
						</p>
					</div>
				</div> */}

				<div className='flex items-center gap-3'>
					<div className='bg-white p-2 rounded-lg shadow-sm text-sm text-gray-600'>
						Range:
					</div>
					<div className='flex gap-2'>
						<button
							onClick={() => setRangeDays(7)}
							className={`px-3 py-1 rounded-lg ${
								rangeDays === 7
									? "bg-emerald-600 text-white"
									: "bg-white text-gray-700 shadow-sm"
							}`}>
							7d
						</button>
						<button
							onClick={() => setRangeDays(30)}
							className={`px-3 py-1 rounded-lg ${
								rangeDays === 30
									? "bg-emerald-600 text-white"
									: "bg-white text-gray-700 shadow-sm"
							}`}>
							30d
						</button>
						<button
							onClick={() => setRangeDays(90)}
							className={`px-3 py-1 rounded-lg ${
								rangeDays === 90
									? "bg-emerald-600 text-white"
									: "bg-white text-gray-700 shadow-sm"
							}`}>
							90d
						</button>
					</div>

					<div className='ml-4 bg-white p-2 rounded-lg shadow-sm'>
						<select
							value={groupBy}
							onChange={(e) => setGroupBy(e.target.value)}
							className='bg-transparent outline-none text-sm'>
							<option value='hour'>Hour</option>
							<option value='day'>Day</option>
							<option value='month'>Month</option>
						</select>
					</div>
				</div>
			</div>

			{/* KPI Tiles */}
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
				<div className='rounded-2xl p-5 bg-white shadow-sm'>
					<div className='flex items-start justify-between'>
						<div>
							<div className='text-sm text-gray-500'>Total Events</div>
							<div className='mt-2 text-3xl font-bold text-gray-900'>
								{loading ? "..." : formatNumber(totalEvents)}
							</div>
							<div className='mt-2 text-xs text-gray-400'>All-time</div>
						</div>
						<div className='flex items-center'>
							{/* <div className='bg-emerald-600/10 text-emerald-700 rounded-full w-12 h-12 flex items-center justify-center'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='w-6 h-6'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'>
									<path
										d='M3 7h18M3 12h18M3 17h18'
										strokeWidth='1.5'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</div> */}
						</div>
					</div>
				</div>

				<div className='rounded-2xl p-5 bg-white shadow-sm'>
					<div className='flex items-start justify-between'>
						<div>
							<div className='text-sm text-gray-500'>Plastics (Today)</div>
							<div className='mt-2 text-3xl font-bold text-emerald-700'>
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
							<div className='mt-2 text-xs text-gray-400'>
								Includes cups, bottles, straws
							</div>
						</div>
						<div className='flex items-center'>
							{/* <div className='bg-emerald-50 text-emerald-700 rounded-full w-12 h-12 flex items-center justify-center'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='w-6 h-6'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'>
									<path
										d='M12 2v20M2 12h20'
										strokeWidth='1.5'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</div> */}
						</div>
					</div>
				</div>

				<div className='rounded-2xl p-5 bg-white shadow-sm'>
					<div className='flex items-start justify-between'>
						<div>
							<div className='text-sm text-gray-500'>Paper (Today)</div>
							<div className='mt-2 text-3xl font-bold text-gray-900'>
								{loading
									? "..."
									: formatNumber(
											Object.keys(compositionTotals).reduce((acc, k) => {
												if (
													[
														"paper",
														"bag",
														"tissue",
														"napkin",
														"serviette",
														"book",
													].some((w) => k.toLowerCase().includes(w))
												) {
													return acc + (compositionTotals[k] || 0);
												}
												return acc;
											}, 0)
									  )}
							</div>
							<div className='mt-2 text-xs text-gray-400'>
								Includes bags, napkins, book paper
							</div>
						</div>
						<div className='flex items-center'>
							{/* <div className='bg-amber-50 text-amber-600 rounded-full w-12 h-12 flex items-center justify-center'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='w-6 h-6'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'>
									<path
										d='M4 6h16M4 12h16M4 18h16'
										strokeWidth='1.5'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</div> */}
						</div>
					</div>
				</div>

				<div className='rounded-2xl p-5 bg-white shadow-sm'>
					<div className='flex items-start justify-between'>
						<div>
							<div className='text-sm text-gray-500'>General (Today)</div>
							<div className='mt-2 text-3xl font-bold text-gray-900'>
								{loading
									? "..."
									: formatNumber(
											Math.max(
												0,
												compositionGrand -
													Object.keys(compositionTotals).reduce((acc, k) => {
														if (
															k.toLowerCase().includes("plastic") ||
															[
																"paper",
																"bag",
																"tissue",
																"napkin",
																"serviette",
																"book",
															].some((w) => k.toLowerCase().includes(w))
														) {
															return acc + (compositionTotals[k] || 0);
														}
														return acc;
													}, 0)
											)
									  )}
							</div>
							<div className='mt-2 text-xs text-gray-400'>All other items</div>
						</div>
						<div className='flex items-center'>
							{/* <div className='bg-gray-50 text-gray-600 rounded-full w-12 h-12 flex items-center justify-center'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='w-6 h-6'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'>
									<path
										d='M12 4v16M4 12h16'
										strokeWidth='1.5'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</div> */}
						</div>
					</div>
				</div>
			</div>

			{/* Trend chart */}
			<div className='bg-white p-4 rounded-2xl shadow-sm min-h-[340px]'>
				<div className='flex items-center justify-between mb-2'>
					<div className='text-sm text-gray-500'>
						Trend (Last {rangeDays} days)
					</div>
					<div className='text-xs text-gray-400'>Group: {groupBy}</div>
				</div>

				{loading ? (
					<div className='h-72 flex items-center justify-center text-gray-400'>
						Loading chart...
					</div>
				) : (
					<ResponsiveContainer width='100%' height={280}>
						<BarChart
							data={chartData}
							margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
							barGap={8} // gap between bars in a group
							barCategoryGap='30%' // gap between groups
						>
							<CartesianGrid strokeDasharray='3 3' stroke='#f3f4f6' />
							<XAxis dataKey='group' tick={{ fontSize: 12 }} />
							<YAxis />
							<Tooltip />
							<Legend />
							{categories.map((cat, i) => (
								<Bar
									key={cat}
									dataKey={cat}
									fill={categoryColor(cat)}
									// optional: control width; comment out if you want auto sizing
									// barSize={20}
								/>
							))}

							{/* Optional: keep the total-line overlay. Remove if you prefer only bars */}
							<Line
								type='monotone'
								dataKey={(row) =>
									categories.reduce((acc, k) => acc + (row[k] || 0), 0)
								}
								stroke='#111827'
								dot={false}
								strokeWidth={2}
							/>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>

			{/* Two separate cards side-by-side: Composition card (left) and Weekly ring card (right) */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
				{/* Composition card */}
				<div className='bg-white p-4 rounded-2xl shadow-sm min-h-[220px]'>
					<div className='flex items-start justify-between mb-2'>
						<div className='text-sm text-gray-500'>Composition (Latest)</div>
						<div className='text-xs text-gray-400'>
							Total: {compositionGrand}
						</div>
					</div>

					<div className='composition-pie-wrapper'>
						<div className='pie-chart' style={{ width: 300, height: 300 }}>
							<ResponsiveContainer width='100%' height='100%'>
								<PieChart>
									<Pie
										data={pieData}
										dataKey='value'
										nameKey='name'
										cx='50%'
										cy='50%'
										innerRadius={70}
										outerRadius={110}
										paddingAngle={6}
										labelLine={false}
										label={({ name, percent }) =>
											`${Math.round(percent * 100)}%`
										}>
										{pieData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={categoryColor(entry.name)}
											/>
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						</div>

						<div className='composition-legend'>
							<div className='space-y-3'>
								{pieData.length === 0 && (
									<div className='text-sm text-gray-400'>No data</div>
								)}
								{pieData.map((p) => (
									<div key={p.name} className='legend-item'>
										<div className='flex items-center gap-3'>
											<div
												style={{
													width: 12,
													height: 12,
													backgroundColor: categoryColor(p.name),
												}}
												className='rounded'
											/>
											<div className='text-sm text-gray-700 capitalize'>
												{p.name}
											</div>
										</div>
										<div className='text-sm font-medium text-gray-900'>
											{p.value}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* WeeklyActivityRing card (separate card, larger, interactive) */}
				<div className='bg-white p-6 rounded-2xl shadow-sm min-h-[220px] flex items-center justify-center'>
					<WeeklyActivityRing dailyCounts={dailyCountsFromSeries} size={180} />
				</div>
			</div>

			{/* Small multiples */}
			<div className='mt-4'>
				<div className='text-sm text-gray-500 mb-2'>Per-class mini trends</div>
				<SmallMultiples groups={groups} series={series} maxItems={6} />
			</div>

			{error && <div className='text-sm text-red-600'>{error}</div>}
		</div>
	);
}