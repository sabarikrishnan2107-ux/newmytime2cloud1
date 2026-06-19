"use client";

import React, { useEffect, useState } from "react";
import { getStaffUser } from "@/lib/staff-user";

const BALLOON_COLORS = ["#ff6ba1", "#ffb347", "#ffd93d", "#6bcb77", "#4d96ff", "#c780ff", "#ff80aa", "#80d0ff"];
const CONFETTI_COLORS = ["#ff4d6d", "#ffc857", "#90e0ef", "#b5ead7", "#c9b6ff", "#ffd6a5"];

// Grab MM-DD for today regardless of timezone formatting quirks.
function todayMD() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Accepts "YYYY-MM-DD" or full date strings; returns "MM-DD" or null.
function dobMonthDay(dob) {
  if (!dob || typeof dob !== "string") return null;
  const match = dob.match(/(\d{2})-(\d{2})$/); // last MM-DD in the string
  if (match) return `${match[1]}-${match[2]}`;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Self-heal broken avatar URLs into the cake emoji.
function handleImgError(e) {
  const parent = e.currentTarget.parentNode;
  if (!parent) return;
  e.currentTarget.style.display = "none";
  if (!parent.querySelector("[data-birthday-fallback]")) {
    const span = document.createElement("div");
    span.dataset.birthdayFallback = "1";
    span.className = "w-full h-full flex items-center justify-center text-2xl";
    span.textContent = "🎂";
    parent.appendChild(span);
  }
}

// Pull the person's display info straight from /me — whichever company they
// belong to. No ai_feeds caching, no backend-regenerate dance when they change
// their avatar or DOB.
function resolvePerson(me) {
  if (!me) return null;
  const emp = me.employee_record || me.employee || {};
  const dob = emp.date_of_birth || me.date_of_birth || null;
  if (!dob) return null;
  if (dobMonthDay(dob) !== todayMD()) return null;

  const firstName = emp.first_name || me.first_name || "";
  const lastName = emp.last_name || me.last_name || "";
  const fullName = (emp.display_name || `${firstName} ${lastName}`).trim() || "Our Teammate";
  const picture = emp.profile_picture || me.employee_profile_picture || me.profile_picture || null;
  const department = emp.department?.name || emp.department_name || null;
  const designation = emp.designation?.name || emp.designation_name || null;
  const branch = emp.branch?.branch_name || emp.branch?.name || me.branch?.branch_name || null;

  let age = null;
  try {
    const d = new Date(dob);
    if (!isNaN(d)) {
      const now = new Date();
      age = now.getFullYear() - d.getFullYear();
      const mdNow = now.getMonth() * 100 + now.getDate();
      const mdDob = d.getMonth() * 100 + d.getDate();
      if (mdNow < mdDob) age--;
    }
  } catch (_) {}

  return { fullName, picture, department, designation, branch, age, key: emp.id || me.id || "self" };
}

export default function BirthdayPopup() {
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getStaffUser();
        const p = resolvePerson(me);
        if (!cancelled && p) {
          setPerson(p);
          setOpen(true);
        }
      } catch (e) {
        console.error("BirthdayPopup resolve failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleClose = () => setOpen(false);

  if (!open || !person) return null;

  const line = [person.designation, person.department, person.branch].filter(Boolean).join(" • ");

  return (
    <div
      role="dialog"
      aria-labelledby="birthday-popup-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl birthday-popup-gradient"
        onClick={(e) => e.stopPropagation()}
      >
        <style jsx>{`
          .birthday-popup-gradient {
            background: linear-gradient(135deg, #ffb1d4 0%, #b489ff 50%, #ffd27a 100%);
          }
          .balloon {
            position: absolute;
            bottom: -40px;
            width: 28px;
            height: 34px;
            border-radius: 50%;
            opacity: 0.9;
            animation: balloon-float linear infinite;
            pointer-events: none;
          }
          .balloon::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 100%;
            width: 1px;
            height: 36px;
            background: rgba(255, 255, 255, 0.7);
            transform: translateX(-50%);
          }
          @keyframes balloon-float {
            0%   { transform: translateY(0)      translateX(0);   opacity: 0; }
            10%  { opacity: 0.95; }
            100% { transform: translateY(-700px) translateX(30px); opacity: 0; }
          }
          .confetti {
            position: absolute;
            top: -20px;
            width: 8px;
            height: 14px;
            opacity: 0.95;
            animation: confetti-fall linear forwards;
            pointer-events: none;
          }
          @keyframes confetti-fall {
            0%   { transform: translateY(0) rotate(0);      opacity: 1; }
            100% { transform: translateY(700px) rotate(720deg); opacity: 0; }
          }
          .title-pulse {
            animation: title-pulse 2s ease-in-out infinite;
          }
          @keyframes title-pulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.04); }
          }
        `}</style>

        {BALLOON_COLORS.map((c, i) => (
          <span
            key={`bp-${i}`}
            aria-hidden="true"
            className="balloon"
            style={{
              left: `${4 + i * 12}%`,
              background: c,
              animationDuration: `${10 + (i % 4) * 2}s`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}

        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={`cf-${i}`}
            aria-hidden="true"
            className="confetti"
            style={{
              left: `${(i * 4.17) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDuration: `${3 + (i % 5) * 0.6}s`,
              animationDelay: `${(i % 8) * 0.15}s`,
            }}
          />
        ))}

        <button
          aria-label="Close"
          className="absolute top-3 right-3 z-20 text-white/90 hover:text-white bg-black/20 hover:bg-black/30 rounded-full w-8 h-8 flex items-center justify-center"
          onClick={handleClose}
        >
          ✕
        </button>

        <div className="relative z-10 px-6 pt-8 pb-4 text-center text-white">
          <div className="text-2xl mb-1" aria-hidden="true">🎆 🎈 🎂 🎈 🎆</div>
          <h2
            id="birthday-popup-title"
            className="text-3xl font-extrabold drop-shadow title-pulse"
          >
            Happy Birthday!
          </h2>
          <p className="text-sm opacity-95 mt-1 italic">
            Wishing you joy, success, and a year full of milestones.
          </p>
        </div>

        <div className="relative z-10 px-6 pb-4">
          <div className="flex items-center gap-4 bg-white/25 backdrop-blur-md rounded-xl p-3 text-white">
            <div className="shrink-0 size-14 rounded-full overflow-hidden ring-4 ring-white/70 bg-white">
              {person.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.picture}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={handleImgError}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🎂</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-extrabold truncate">
                {person.fullName}
                {person.age ? <span className="opacity-80 font-semibold text-xs ml-2">({person.age})</span> : null}
              </div>
              {line && (
                <div className="text-[11px] opacity-95 truncate">{line}</div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 px-6 pb-6 pt-2 text-center">
          <button
            onClick={handleClose}
            className="inline-flex items-center justify-center bg-white text-purple-700 hover:bg-purple-50 font-bold px-6 py-2 rounded-full shadow-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
