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

// Device weekday convention. Our grid is Monday-first (Mon=0 … Sun=6). The OX access
// devices index weekdays Sunday-first (Sun=0 … Sat=6), so a window selected on our
// "Friday" (4) must be sent as device day 5 or it lands on the wrong weekday and the
// door blocks at the right time. Shift by +1. If a device turns out to be Monday-first,
// set DEVICE_DAY_OFFSET = 0 to disable the shift.
export const DEVICE_DAY_OFFSET = 1;
const gridToDeviceDay = (d) => (d + DEVICE_DAY_OFFSET) % 7;
const deviceToGridDay = (d) => (d - DEVICE_DAY_OFFSET + 7) % 7;

// selected: Array(7) of Set<slotIndex> → ["1-12","1-13",...] (device-day keyed)
export function slotsToRawData(selected) {
  const out = [];
  selected.forEach((set, day) => {
    const dev = gridToDeviceDay(day);
    [...set].sort((a, b) => a - b).forEach((slot) => out.push(`${dev}-${slot}`));
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
    const [dev, slot] = String(key).split("-").map(Number);
    // Stored keys are device-day indexed; convert back to the grid's Monday-first rows.
    if (dev >= 0 && dev <= 6 && slot >= 0 && slot <= 47) selected[deviceToGridDay(dev)].add(slot);
  });
  return selected;
}
