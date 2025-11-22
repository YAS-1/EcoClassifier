// events.controller.js
import Event from '../models/Event.model.js';
import { Parser } from 'json2csv';

/**
 * GET /api/events
 * Query: ?page=1&limit=50
 */
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

/**
 * GET /api/stats
 * Query params:
 * - rangeStart, rangeEnd (ISO strings)
 * - groupBy = hour|day|month (default day)
 * - categories = comma separated (optional)
 */
export const getAggregated = async (req, res) => {
  try {
    const { rangeStart, rangeEnd, groupBy = 'day', categories, deviceId } = req.query;
    const match = {};
    if (rangeStart || rangeEnd) {
      match.timestamp = {};
      if (rangeStart) match.timestamp.$gte = new Date(rangeStart);
      if (rangeEnd) match.timestamp.$lte = new Date(rangeEnd);
    }
    if (categories) match.category = { $in: categories.split(',').map(c => c.trim()) };
    if (deviceId) match.deviceId = deviceId;

    let groupExpr;
    if (groupBy === 'hour') {
      groupExpr = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
    } else if (groupBy === 'month') {
      groupExpr = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' }
      };
    } else {
      groupExpr = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
    }

    const pipeline = [
      { $match: match },
      { $group: { _id: { group: groupExpr, category: '$category' }, count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id.category', count: 1, group: '$_id.group' } },
      { $sort: { 'group.year': 1, 'group.month': 1, 'group.day': 1, 'group.hour': 1 } }
    ];

    const rows = await Event.aggregate(pipeline).allowDiskUse(true);
    // Transform to groups & series
    const groupByKey = (g) => {
      if (groupBy === 'hour') return `${g.year}-${String(g.month).padStart(2,'0')}-${String(g.day).padStart(2,'0')}T${String(g.hour).padStart(2,'0')}:00`;
      if (groupBy === 'month') return `${g.year}-${String(g.month).padStart(2,'0')}`;
      return `${g.year}-${String(g.month).padStart(2,'0')}-${String(g.day).padStart(2,'0')}`;
    };

    const groupOrder = [];
    const series = {};
    const seen = new Set();

    rows.forEach(r => {
      const key = groupByKey(r.group);
      if (!groupOrder.includes(key)) groupOrder.push(key);
      if (!series[r.category]) series[r.category] = [];
      seen.add(r.category);
    });

    // init arrays with zeros
    Object.keys(series).forEach(cat => {
      series[cat] = groupOrder.map(() => 0);
    });

    // fill counts (rows may not be in perfect group order for each category)
    rows.forEach(r => {
      const key = groupByKey(r.group);
      const idx = groupOrder.indexOf(key);
      if (!series[r.category]) series[r.category] = groupOrder.map(() => 0);
      series[r.category][idx] = r.count;
    });

    res.json({ success: true, groupBy, groups: groupOrder, series });
  } catch (err) {
    console.error('getAggregated err', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/export
 * Returns CSV of events
 */
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