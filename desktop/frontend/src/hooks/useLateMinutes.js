import { useMemo } from "react";

function parseDateTime(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== "string") return null;

  // Supports "YYYY-MM-DD HH:mm:ss" and "YYYY-MM-DDTHH:mm:ss"
  const normalized = dateTimeStr.trim().replace(" ", "T");
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) return parsed;

  // Fallback parser for strict "YYYY-MM-DD HH:mm:ss"
  const match = dateTimeStr
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) return null;

  const [, y, m, d, h, min, s = "0"] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
}

function parseGraceMinutes(graceTimeStr) {
  if (!graceTimeStr || typeof graceTimeStr !== "string") return 0;

  const [hours, minutes] = graceTimeStr.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function getLateMinutes(arrivalTimeStr, shiftStartTimeStr, graceTimeStr = "00:00") {
  const arrival = parseDateTime(arrivalTimeStr);
  const shiftStart = parseDateTime(shiftStartTimeStr);

  if (!arrival || !shiftStart) return 0;

  const totalGraceMinutes = parseGraceMinutes(graceTimeStr);
  const graceThreshold = new Date(shiftStart.getTime() + totalGraceMinutes * 60000);

  if (arrival > graceThreshold) {
    const diffMs = arrival.getTime() - shiftStart.getTime();
    return Math.floor(diffMs / 60000);
  }

  return 0;
}

export default function useLateMinutes(arrivalTimeStr, shiftStartTimeStr, graceTimeStr = "00:00") {
  return useMemo(
    () => getLateMinutes(arrivalTimeStr, shiftStartTimeStr, graceTimeStr),
    [arrivalTimeStr, shiftStartTimeStr, graceTimeStr]
  );
}
