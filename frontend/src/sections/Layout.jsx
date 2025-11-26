import React from "react";
import Sidebar from "./Sidebar";


export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F7F9] text-gray-800">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-white shadow-sm min-h-screen sticky top-0">
          <Sidebar />
        </aside>

        {/* Main area */}
        <div className="flex-1 min-h-screen">
          {/* Page content */}
          <main className="p-6 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}