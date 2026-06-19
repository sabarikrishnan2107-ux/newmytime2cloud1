"use client";

import React, { useState } from "react";

// Mock data now includes an ID for better key handling
const initialFeed = [
  { id: 1, time: "09:02 AM", name: "Chen W." },
  { id: 2, time: "08:58 AM", name: "Amelia P." },
  { id: 3, time: "08:55 AM", name: "Robert H." },
  { id: 4, time: "08:45 AM", name: "Sara J." },
  { id: 5, time: "08:30 AM", name: "David L." },
];

// Inline SVG for the Clock icon (similar to lucide-react, but self-contained)
const ClockIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// Inline SVG for the Checkmark icon
const CheckIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function Attendance() {
  const [feed, setFeed] = useState(initialFeed);

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl">
      {/* <ul>
        <li className="pb-5 text-center text-sm font-medium text-gray-500">
          --- Showing {feed.length} Recent Entries ---
        </li>
      </ul> */}
      <h3 className="text-2xl font-bold text-gray-700 mb-5">Live Logs</h3>
      <div className="overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {feed.map((entry) => (
            <li
              key={entry.id}
              className="py-3 flex justify-between items-center transition duration-300 hover:bg-green-50 rounded-xl p-3 -mx-3 cursor-pointer group"
            >
              <div className="flex items-center space-x-4">
                {/* Status Icon */}
                <div className="p-2 bg-green-100 rounded-full text-green-600 transition duration-300 group-hover:bg-green-200">
                  <CheckIcon className="w-4 h-4" />
                </div>

                {/* Name and Status */}
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-gray-900 truncate">
                    {entry.name}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center">
                    <span className="text-green-500 mr-1 font-medium">
                      Clocked In
                    </span>
                    <span className="hidden sm:inline">@ Device Name</span>
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="ml-4  text-green-400   px-3 py-1 rounded-lg  transition duration-300 group-hover:bg-green-100">
                {entry.time}
              </div>
            </li>
          ))}
          {/* Footer message for more entries */}
        </ul>
      </div>
    </div>
  );
}
