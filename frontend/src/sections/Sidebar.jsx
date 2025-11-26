import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUpload,
  FaListAlt,
  FaChartBar,
  FaDatabase,
  FaCog,
  FaQuestionCircle,
  FaSignOutAlt
} from "react-icons/fa";


const items = [
  { to: "/", label: "Dashboard", icon: FaTachometerAlt },
  { to: "/upload", label: "Upload", icon: FaUpload },
  { to: "/events", label: "Events", icon: FaListAlt },
  { to: "/analytics", label: "Analytics", icon: FaChartBar },
  { to: "/models", label: "Models", icon: FaDatabase } // optional admin page
];

const FooterItem = ({ to, label, Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 ${isActive ? "bg-emerald-50 border-l-4 border-emerald-600" : ""}`
    }
  >
    <Icon className="text-gray-600" />
    <span className="text-sm text-gray-700">{label}</span>
  </NavLink>
);

export default function Sidebar() {
  return (
    <div className="flex flex-col h-full p-5 space-y-6">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2">
        {/* <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
          <img
            src="../assets/EcoClassifier_logo.png"
            alt="EcoClassifier logo"
            className="w-10 h-10 rounded-full object-cover"
          />
        </div> */}
        <div>
          <div className="text-lg font-semibold text-emerald-600">EcoClassifier</div>
          <div className="text-xs text-gray-400">Smart Waste Dashboard</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer ${isActive ? "bg-emerald-50 border-l-4 border-emerald-600" : "hover:bg-gray-50"}`
              }
            >
              <div className={`text-sm ${"text-gray-600"}`}>
                <Icon />
              </div>
              <div className={`text-sm font-medium ${"text-gray-700"}`}>{it.label}</div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-3">
        <div className="border-t pt-3">
          <div className="text-xs text-gray-400 uppercase mb-2">General</div>

          <div className="space-y-2">
            <FooterItem to="/settings" label="Settings" Icon={FaCog} />
            <FooterItem to="/help" label="Help" Icon={FaQuestionCircle} />
            <div
              role="button"
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 cursor-pointer"
              onClick={() => { /* implement logout logic later */ }}
            >
              <FaSignOutAlt className="text-gray-600" />
              <span className="text-sm text-gray-700">Logout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
