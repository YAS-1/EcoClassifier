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
        <Route path="/analytics" element={<div>Analytics - TODO</div>} />
        <Route path="/models" element={<div>Models - TODO</div>} />
        <Route path="/settings" element={<div>Settings - TODO</div>} />
        <Route path="/help" element={<div>Help - TODO</div>} />
      </Routes>
    </Layout>
  );
}

export default App;