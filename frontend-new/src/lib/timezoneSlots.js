// Pure helpers converting the weekly grid (Set per day of 30-min slot indices)
// to/from the backend timezone contract. Day order: 0=Mon … 6=Sun.

export const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_CODES = ["M", "T", "W", "TH", "F", "SA", "SU"];

// 48 half-hour labels: "00:00","00:30",…,"23:30"
export const SLOT_LABELS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

// selected: Array(7) of Set<slotIndex> → ["0-12","0-13",...]
export function slotsToRawData(selected) {
  const out = [];
  selected.forEach((set, day) => {
    [...set].sort((a, b) => a - b).forEach((slot) => out.push(`${day}-${slot}`));
  });
  return out;
}

// scheduled_days payload the backend stores.
export function buildScheduledDays(selected) {
  return DAY_CODES.map((day, dayWeek) => ({
    day,
    isScheduled: selected[dayWeek].size > 0,
    dayWeek,
  }));
}

// Build the full create/update payload (minus name/description/company_id).
export function buildTimezonePayload(selected) {
  const raw = slotsToRawData(selected);
  return {
    interval: Array.from({ length: 7 }, () => []), // required array; server overwrites
    intervals_raw_data: JSON.stringify(raw),
    input_time_slots: SLOT_LABELS,
    scheduled_days: buildScheduledDays(selected),
  };
}

// Edit: parse a stored intervals_raw_data (string or array) back to Array(7) of Set.
export function rawDataToSlots(rawData) {
  const selected = Array.from({ length: 7 }, () => new Set());
  let arr = rawData;
  if (typeof arr === "string") {
    try { arr = JSON.parse(arr); } catch { arr = []; }
  }
  (arr || []).forEach((key) => {
    const [day, slot] = String(key).split("-").map(Number);
    if (day >= 0 && day <= 6 && slot >= 0 && slot <= 47) selected[day].add(slot);
  });
  return selected;
}
