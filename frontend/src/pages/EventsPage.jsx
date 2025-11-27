// frontend/src/pages/EventsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  HiChevronLeft,
  HiChevronRight,
  HiDownload,
  HiSearch,
  HiX,
} from "react-icons/hi";
import clsx from "clsx";

/**
 * Events page with:
 * - server-side pagination
 * - category filter
 * - CSV export (calls /export)
 * - image preview modal (show big image + raw_prediction)
 * - timestamp formatting with dayjs (local time)
 *
 * Notes:
 * - backend /events already does pagination via ?page=&limit=
 * - /export returns CSV (we download it as blob)
 */

const PAGE_SIZES = [10, 25, 50, 100];

function formatTimestamp(ts) {
  if (!ts) return "—";
  return dayjs(ts).format("YYYY-MM-DD, h:mm:ss A");
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [query, setQuery] = useState("");
  const [fetchError, setFetchError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const q = { page, limit };
        if (categoryFilter) q.category = categoryFilter;
        if (query) q.q = query;
        const params = new URLSearchParams(q).toString();
        const { data } = await api.get(`/events?${params}`);
        if (cancelled) return;

        setEvents(data.events || []);
        setTotal(data.total || 0);

        const uniq = new Set((data.events || []).map((e) => e.category).filter(Boolean));
        setCategories((prev) => {
          const merged = new Set([...(prev || []), ...Array.from(uniq)]);
          return Array.from(merged);
        });
      } catch (err) {
        console.error("Events load err", err);
        setFetchError(err?.message || "Failed to load events");
        toast.error("Failed to load events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page, limit, categoryFilter, query, refreshKey]);

  const handleExportCSV = async () => {
    try {
      toast.loading("Preparing CSV...");
      const resp = await api.get("/export", { responseType: "blob" });
      const blob = new Blob([resp.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ecoclassifier_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("CSV downloaded");
    } catch (err) {
      console.error("Export CSV err", err);
      toast.dismiss();
      toast.error("Failed to download CSV");
    }
  };

  const openPreview = (ev) => {
    setPreview(ev);
    document.body.style.overflow = "hidden";
  };
  const closePreview = () => {
    setPreview(null);
    document.body.style.overflow = "";
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded overflow-hidden bg-white">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search (filename, location...)"
              className="px-3 py-2 w-56 outline-none text-sm"
            />
            <button
              onClick={() => {
                setPage(1);
                setRefreshKey((k) => k + 1);
              }}
              className="px-3 py-2 text-sm border-l bg-emerald-50 hover:bg-emerald-100"
              title="Search"
            >
              <HiSearch className="inline w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setQuery("");
                setPage(1);
                setRefreshKey((k) => k + 1);
              }}
              className="px-3 py-2 text-sm border-l hover:bg-gray-50"
              title="Clear"
            >
              Clear
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white border px-3 py-2 rounded text-sm"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="bg-white border px-3 py-2 rounded text-sm"
            aria-label="Page size"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}/page
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700 text-sm"
          >
            <HiDownload className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-sm overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-left text-sm text-gray-600">
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Filename</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Confidence</th>
              <th className="px-3 py-3">Device</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Timestamp</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  Loading events...
                </td>
              </tr>
            )}

            {!loading && events.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  No events found
                </td>
              </tr>
            )}

            {!loading &&
              events.map((ev) => (
                <tr key={ev._id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-4 align-top">
                    <button onClick={() => openPreview(ev)} className="block rounded overflow-hidden w-16 h-16">
                      <img src={ev.imageUrl} alt={ev.filename || "event image"} className="w-16 h-16 object-cover rounded" />
                    </button>
                  </td>

                  <td className="px-3 py-4 align-top">{ev.filename || "—"}</td>
                  <td className="px-3 py-4 align-top capitalize">{ev.category || "—"}</td>
                  <td className="px-3 py-4 align-top">{((ev.confidence ?? 0) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-4 align-top">{ev.deviceId || "—"}</td>
                  <td className="px-3 py-4 align-top">{ev.location || "—"}</td>
                  <td className="px-3 py-4 align-top">{formatTimestamp(ev.timestamp)}</td>
                  <td className="px-3 py-4 align-top">
                    <div className="flex gap-2">
                      <button onClick={() => openPreview(ev)} className="text-sm px-2 py-1 rounded bg-emerald-50 text-emerald-700">Preview</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <strong>{events.length}</strong> of <strong>{total}</strong> events
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={clsx("p-2 rounded border", page <= 1 && "opacity-50 cursor-not-allowed")}
            title="Previous"
          >
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm px-3 py-1 border rounded">{page}</div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={clsx("p-2 rounded border", page >= totalPages && "opacity-50 cursor-not-allowed")}
            title="Next"
          >
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50" onClick={closePreview} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-3xl z-10 overflow-auto">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-lg font-semibold">Event preview</div>
              <button onClick={closePreview} className="p-1 rounded hover:bg-gray-100">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 flex items-center justify-center">
                <img src={preview.imageUrl} alt={preview.filename || "preview"} className="max-h-96 object-contain rounded" />
              </div>

              <div className="md:col-span-2 space-y-3">
                <div><strong>Filename:</strong> {preview.filename || "—"}</div>
                <div><strong>Category:</strong> {preview.category || "—"}</div>
                <div><strong>Confidence:</strong> {((preview.confidence ?? 0) * 100).toFixed(1)}%</div>
                <div><strong>Device:</strong> {preview.deviceId || "—"}</div>
                <div><strong>Location:</strong> {preview.location || "—"}</div>
                <div><strong>Timestamp:</strong> {formatTimestamp(preview.timestamp)}</div>

                <div>
                  <strong>Raw prediction</strong>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto" style={{ maxHeight: 200 }}>
                    {JSON.stringify(preview.raw_prediction || {}, null, 2)}
                  </pre>
                </div>

                <div className="flex gap-2 pt-2">
                  <a href={preview.imageUrl} target="_blank" rel="noreferrer" className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Open image</a>
                  <button onClick={() => {
                    const a = document.createElement("a");
                    a.href = preview.imageUrl;
                    a.download = preview.filename || "image.jpg";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }} className="px-3 py-2 border rounded text-sm">Download image</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
