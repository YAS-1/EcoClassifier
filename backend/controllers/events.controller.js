// events.controller.js
import Event from '../models/Event.model.js';
import { Parser } from 'json2csv';


// getEvents controller
export const getEvents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '50', 10));
    const skip = (page - 1) * limit;

    const docs = await Event.find().sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
    const total = await Event.countDocuments();

    res.json({ success: true, page, limit, total, events: docs });
  } catch (err) {
    console.error('getEvents err', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// Changed getAggregated function------------------------------------------------------------
export const getAggregated = async (req, res) => {
  try {
    const { rangeStart, rangeEnd, groupBy = "day", categories, deviceId } = req.query;
    const match = {};
    if (rangeStart || rangeEnd) {
      match.timestamp = {};
      if (rangeStart) match.timestamp.$gte = new Date(rangeStart);
      if (rangeEnd) match.timestamp.$lte = new Date(rangeEnd);
    }
    if (categories) match.category = { $in: categories.split(",").map((c) => c.trim()) };
    if (deviceId) match.deviceId = deviceId;

    // timezone (default to UTC if not set)
    const TZ = process.env.TIMEZONE || "UTC";

    // pick truncation unit for $dateTrunc
    let unit = "day";
    if (groupBy === "hour") unit = "hour";
    else if (groupBy === "month") unit = "month";

    // Steps:
    // 1) Create truncatedDate using $dateTrunc with timezone
    // 2) Group by truncatedDate + category
    // 3) Project out truncatedDate (as Date) and later produce ISO & epoch ms arrays

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          _trunc: {
            $dateTrunc: { date: "$timestamp", unit: unit, timezone: TZ }
          }
        }
      },
      {
        $group: {
          _id: { truncated: "$_trunc", category: "$category" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          truncatedDate: "$_id.truncated", // Date object (timezone applied by $dateTrunc)
          category: "$_id.category",
          count: 1
        }
      },
      // sort by truncatedDate ascending
      { $sort: { truncatedDate: 1, category: 1 } }
    ];

    const rows = await Event.aggregate(pipeline).allowDiskUse(true);

    // Build groupOrder (ordered unique truncatedDate), and series map
    const groupDates = [];
    const groupSet = new Set();
    const series = {};

    rows.forEach((r) => {
      // truncatedDate is a JS Date when returned by aggregation library
      // but inside Node it may be a Date object — use getTime() for uniqueness
      const ms = (r.truncatedDate instanceof Date) ? r.truncatedDate.getTime() : new Date(r.truncatedDate).getTime();
      if (!groupSet.has(ms)) {
        groupSet.add(ms);
        groupDates.push(ms);
      }
      if (!series[r.category]) series[r.category] = {};
    });

    // Ensure groupDates sorted ascending
    groupDates.sort((a, b) => a - b);

    // Initialize series arrays with zeros
    Object.keys(series).forEach((cat) => {
      series[cat] = groupDates.map(() => 0);
    });

    // Fill series counts
    rows.forEach((r) => {
      const ms = (r.truncatedDate instanceof Date) ? r.truncatedDate.getTime() : new Date(r.truncatedDate).getTime();
      const idx = groupDates.indexOf(ms);
      if (idx === -1) return;
      if (!series[r.category]) series[r.category] = groupDates.map(() => 0);
      series[r.category][idx] = r.count;
    });

    // Convert groupDates (ms) to ISO strings in UTC for readability
    const groupsIso = groupDates.map((ms) => new Date(ms).toISOString()); // e.g. "2025-11-26T19:00:00.000Z"
    const groupsMillis = groupDates; // epoch ms

    return res.json({
      success: true,
      groupBy,
      groups: groupsIso,      // canonical ISO strings (UTC)
      groupsMillis,          // epoch ms (preferred for client parsing)
      series,
    });
  } catch (err) {
    console.error("getAggregated err", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// exportCSV controller
export const exportCSV = async (req, res) => {
  try {
    const docs = await Event.find().sort({ timestamp: -1 }).lean();
    const fields = ['timestamp','filename','imageUrl','category','confidence','deviceId','location'];
    const parser = new Parser({ fields });
    const csv = parser.parse(docs || []);
    res.header('Content-Type', 'text/csv');
    res.attachment('ecoclassifier_export.csv');
    res.send(csv);
  } catch (err) {
    console.error('exportCSV err', err);
    res.status(500).json({ success: false, message: err.message });
  }
};