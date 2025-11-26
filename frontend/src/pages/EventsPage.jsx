// src/pages/EventsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api";

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/events?page=1&limit=50");
        setEvents(data.events || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Events</h1>
      <div className="bg-white p-4 rounded shadow-sm">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-left text-sm text-gray-600">
              <th className="px-2 py-2">Image</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Confidence</th>
              <th className="px-2 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev._id} className="border-t">
                <td className="px-2 py-3"><img src={ev.imageUrl} alt={ev.filename} className="w-16 rounded" /></td>
                <td className="px-2 py-3">{ev.category}</td>
                <td className="px-2 py-3">{(ev.confidence*100 || 0).toFixed(1)}%</td>
                <td className="px-2 py-3">{new Date(ev.timestamp).toLocaleString()}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={4} className="px-2 py-6 text-center text-gray-400">No events yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventsPage;