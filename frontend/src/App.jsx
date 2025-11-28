import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/UploadPage";
import EventsPage from "./pages/EventsPage";
import Layout from "./sections/Layout";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/events" element={<EventsPage />} />
        {/* placeholder routes for future pages */}
        <Route path="/analytics" element={<div>Analytics - TO DO</div>} />
        <Route path="/models" element={<div>Models - TO DO</div>} />
        <Route path="/settings" element={<div>Settings - TO DO</div>} />
        <Route path="/help" element={<div>Help - TO DO</div>} />
      </Routes>
    </Layout>
  );
}

export default App;