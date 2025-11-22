// events.routes.js
import express from 'express';
import { getEvents, getAggregated, exportCSV } from '../controllers/events.controller.js';

const Eventrouter = express.Router();

Eventrouter.get('/events', getEvents);
Eventrouter.get('/stats', getAggregated);
Eventrouter.get('/export', exportCSV);

export default Eventrouter; // export the router;