"use client";

import React from "react";
import { twMerge } from "tailwind-merge"; // Optional but highly recommended
import { clsx } from "clsx"; // Optional but helpful for conditional logic

export const Loader = ({ text = "Loading....", className = "" }) => {
  return (
    // We combine the base classes with the incoming className prop
    <div className={twMerge("p-5 flex items-center justify-center min-h-screen", className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p className="ml-3">{text}</p>
    </div>
  );
};