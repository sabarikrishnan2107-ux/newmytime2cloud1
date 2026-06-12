// Shift type IDs — must stay in sync with frontend-new/src/lib/dropdowns.js
// and frontend-new/src/app/report/columns.js
export const SHIFT_TYPE = {
  FLEXIBLE: 1, // also FILO in some report contexts
  MULTI: 2,
  AUTO: 3,
  NIGHT: 4,
  SPLIT: 5,
  SINGLE: 6,
};

const SINGLE_PERIOD_TYPES = new Set([
  SHIFT_TYPE.FLEXIBLE,
  SHIFT_TYPE.NIGHT,
  SHIFT_TYPE.SINGLE,
]);

const PER_PAIR_TYPES = new Set([SHIFT_TYPE.MULTI, SHIFT_TYPE.AUTO]);

const SHIFT_NAME = {
  [SHIFT_TYPE.FLEXIBLE]: "Flexible",
  [SHIFT_TYPE.MULTI]: "Multi",
  [SHIFT_TYPE.AUTO]: "Auto",
  [SHIFT_TYPE.NIGHT]: "Night",
  [SHIFT_TYPE.SPLIT]: "Split",
  [SHIFT_TYPE.SINGLE]: "Single",
};

/**
 * Build display rows from raw mobile attendance logs.
 *
 * Each output row has shape:
 *   {
 *     key:           string,        // unique row key
 *     groupKey:      string,        // employee+date — drives rowSpan merging
 *     groupRowCount: number,        // total rows for this group
 *     groupRowIndex: number,        // 0-based row position within the group
 *     shiftTypeId:   number | null,
 *     shiftLabel:    string,        // "Single", "Split · 1/2", "Multi · 2/3", "—"
 *     inLog:         object | null,
 *     outLog:        object | null,
 *     extraPunches:  Array<object>, // intermediate logs collapsed into this row
 *   }
 */
export function groupRows(logs) {
  const groups = new Map();
  for (const l of logs) {
    const userId = l.UserID || l?.employee?.employee_id || "";
    const date = l.date || "";
    const key = `${userId}|${date}`;
    if (!groups.has(key)) groups.set(key, { key, logs: [] });
    groups.get(key).logs.push(l);
  }

  const out = [];
  for (const { key: groupKey, logs: groupLogs } of groups.values()) {
    const sorted = [...groupLogs].sort((a, b) =>
      String(a.time).localeCompare(String(b.time))
    );
    const shiftTypeId = sorted.find((l) => l.shift_type_id != null)?.shift_type_id ?? null;

    let rows;
    if (SINGLE_PERIOD_TYPES.has(shiftTypeId)) {
      rows = collapseToSingleRow(sorted, shiftTypeId, groupKey);
    } else if (shiftTypeId === SHIFT_TYPE.SPLIT) {
      rows = splitIntoTwoRows(sorted, groupKey);
    } else if (PER_PAIR_TYPES.has(shiftTypeId)) {
      rows = pairByPair(sorted, shiftTypeId, groupKey);
    } else {
      rows = pairByPair(sorted, null, groupKey);
    }

    rows.forEach((r, idx) => {
      r.groupKey = groupKey;
      r.groupRowIndex = idx;
      r.groupRowCount = rows.length;
    });
    out.push(...rows);
  }

  return out.sort((a, b) => {
    const aRef = a.inLog || a.outLog;
    const bRef = b.inLog || b.outLog;
    const d = String(bRef?.date || "").localeCompare(String(aRef?.date || ""));
    if (d !== 0) return d;
    return String(aRef?.time || "").localeCompare(String(bRef?.time || ""));
  });
}

function collapseToSingleRow(sorted, shiftTypeId, groupKey) {
  const ins = sorted.filter((l) => String(l.log_type || "").toLowerCase() === "in");
  const outs = sorted.filter((l) => String(l.log_type || "").toLowerCase() === "out");
  const firstIn = ins[0] || null;
  const lastOut = outs[outs.length - 1] || null;
  const extras = sorted.filter((l) => l !== firstIn && l !== lastOut);

  return [
    {
      key: `${groupKey}|collapsed`,
      shiftTypeId,
      shiftLabel: SHIFT_NAME[shiftTypeId] || "—",
      inLog: firstIn,
      outLog: lastOut,
      extraPunches: extras,
    },
  ];
}

function splitIntoTwoRows(sorted, groupKey) {
  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    if (
      String(cur.log_type || "").toLowerCase() === "out" &&
      String(nxt.log_type || "").toLowerCase() === "in"
    ) {
      gaps.push({ idx: i, gapMin: timeGapMinutes(cur.time, nxt.time) });
    }
  }

  if (gaps.length === 0) {
    return [makeRowFromSlice(sorted, SHIFT_TYPE.SPLIT, groupKey, 1, 2, "p1")];
  }

  gaps.sort((a, b) => b.gapMin - a.gapMin);
  const splitAt = gaps[0].idx;
  const left = sorted.slice(0, splitAt + 1);
  const right = sorted.slice(splitAt + 1);

  return [
    makeRowFromSlice(left, SHIFT_TYPE.SPLIT, groupKey, 1, 2, "p1"),
    makeRowFromSlice(right, SHIFT_TYPE.SPLIT, groupKey, 2, 2, "p2"),
  ];
}

function makeRowFromSlice(slice, shiftTypeId, groupKey, n, total, suffix) {
  const ins = slice.filter((l) => String(l.log_type || "").toLowerCase() === "in");
  const outs = slice.filter((l) => String(l.log_type || "").toLowerCase() === "out");
  const firstIn = ins[0] || null;
  const lastOut = outs[outs.length - 1] || null;
  const extras = slice.filter((l) => l !== firstIn && l !== lastOut);
  return {
    key: `${groupKey}|${suffix}`,
    shiftTypeId,
    shiftLabel: `${SHIFT_NAME[shiftTypeId]} · ${n}/${total}`,
    inLog: firstIn,
    outLog: lastOut,
    extraPunches: extras,
  };
}

function pairByPair(sorted, shiftTypeId, groupKey) {
  const rows = [];
  let pending = null;
  let n = 0;
  const baseLabel = shiftTypeId != null ? SHIFT_NAME[shiftTypeId] : "—";

  for (const l of sorted) {
    const type = String(l.log_type || "").toLowerCase();
    if (type === "in") {
      if (pending) {
        n += 1;
        rows.push({
          key: `${groupKey}|${n}`,
          shiftTypeId,
          shiftLabel: baseLabel,
          inLog: pending,
          outLog: null,
          extraPunches: [],
        });
      }
      pending = l;
    } else if (type === "out") {
      if (pending) {
        n += 1;
        rows.push({
          key: `${groupKey}|${n}`,
          shiftTypeId,
          shiftLabel: baseLabel,
          inLog: pending,
          outLog: l,
          extraPunches: [],
        });
        pending = null;
      } else {
        n += 1;
        rows.push({
          key: `${groupKey}|${n}`,
          shiftTypeId,
          shiftLabel: baseLabel,
          inLog: null,
          outLog: l,
          extraPunches: [],
        });
      }
    }
  }
  if (pending) {
    n += 1;
    rows.push({
      key: `${groupKey}|${n}`,
      shiftTypeId,
      shiftLabel: baseLabel,
      inLog: pending,
      outLog: null,
      extraPunches: [],
    });
  }

  if (shiftTypeId != null && rows.length > 1) {
    rows.forEach((r, i) => {
      r.shiftLabel = `${baseLabel} · ${i + 1}/${rows.length}`;
    });
  }

  return rows;
}

function timeGapMinutes(t1, t2) {
  const toMin = (t) => {
    const [h = 0, m = 0] = String(t).split(":").map(Number);
    return h * 60 + m;
  };
  return Math.max(0, toMin(t2) - toMin(t1));
}
