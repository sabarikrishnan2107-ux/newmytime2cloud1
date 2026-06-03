import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import Swal from 'sweetalert2';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};



export function getEmployeeDocumentDonwloadLink(pic, file_name) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend.mytime2cloud.com/api';

  console.log("🚀 ~ getEmployeeDocumentDonwloadLink ~ pic, file_name:", pic, file_name)
  return (
    `${API_BASE}/download-emp-documents/${pic}/${file_name}`
  );
}

export function addTimes(time1, time2) {
  if (!time1 || !time2) return "";

  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);

  // Convert both to minutes
  const totalMinutes = h1 * 60 + m1 + h2 * 60 + m2;

  // Convert back to HH:mm
  const hours = Math.floor((totalMinutes / 60) % 24);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

export function formatDate(value) {
  if (!value) return ""; // handle null/undefined safely
  if (value instanceof Date) {
    return value.toISOString().split("T")[0]; // convert Date → ISO → date-only
  }
  if (typeof value === "string") {
    return value.split("T")[0]; // already a string → split
  }
  return ""; // fallback if something unexpected
};

export const formatDateDubai = (date = new Date()) => {
  if (!date) return "";
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai", // ✅ use Dubai timezone
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // returns YYYY-MM-DD
};

// For dates the user PICKED on a calendar (a plain civil date with no real
// time component). react-day-picker stores the clicked day as local midnight,
// so we must serialize its LOCAL year/month/day — never reproject it into
// another timezone, or clients east of Dubai (e.g. IST, UTC+5:30) shift back
// a day (pick May 1 -> send Apr 30). Already-formatted "YYYY-MM-DD" strings
// pass through unchanged.
export const formatDateLocal = (date = new Date()) => {
  if (!date) return "";
  if (typeof date === "string") {
    // If it's already a plain YYYY-MM-DD, keep it as-is.
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // returns YYYY-MM-DD in the user's local day
};

// Parse a plain "YYYY-MM-DD" into a LOCAL-midnight Date. `new Date("2026-05-01")`
// parses as UTC midnight, which lands on the previous day for users west of UTC
// when read back into the calendar. Building the Date from numeric parts keeps
// the civil day intact in every timezone. Non date-only values fall back to the
// native Date constructor.
export const parseDateLocal = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const parseApiError = (error) => {
  if (error.response) {

    const status = error.response.status;
    const responseData = error.response.data;

    if (status === 422) {
      return (
        responseData.message || "Validation failed. Please check the form fields for errors."
      );

      // You may also want to integrate responseData.errors with react-hook-form's setError here

    } else if (status >= 500) {
      // 500: Server error
      return ("A critical server error occurred. Please try again later.");
    } else {
      // Other errors (401, 403, 404, etc.)
      return (responseData.message || `An error occurred with status ${status}.`);
    }

  } else {
    // Network error
    return ("Network error: Could not connect to the API.");
  }
}


export const setStatusLabel = (status) => {
  const statuses = {
    A: "Absent",
    P: "Present",
    M: "Missing",
    LC: "Present",
    EG: "Present",
    O: "Week Off",
    L: "Leave",
    H: "Holiday",
    V: "Vacation",
  };
  return statuses[status];
};

export const getBgColor = (status) => {
  const styles = {
    // A: Absent (Red/Rose)
    A: "border bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-500/5 dark:border-rose-500/20 dark:text-rose-400",

    // P: Present, LC: Late Coming, EG: Early Going (Green)
    P: "border bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-500/5 dark:border-emerald-500/20 dark:text-emerald-400",
    LC: "border bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-500/5 dark:border-emerald-500/20 dark:text-emerald-400",
    EG: "border bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-500/5 dark:border-emerald-500/20 dark:text-emerald-400",

    // L: Leave (Yellow)
    L: "border bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-500/5 dark:border-yellow-500/20 dark:text-yellow-400",

    // O: Off-day (Orange)
    O: "border bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-500/5 dark:border-orange-500/20 dark:text-orange-400",

    // H: Holiday, V: Vacation (Indigo)
    H: "border bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-500/5 dark:border-indigo-500/20 dark:text-indigo-400",
    V: "border bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-500/5 dark:border-indigo-500/20 dark:text-indigo-400",

    // M: Misc / Neutral (Gray)
    M: "border bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-500/5 dark:border-slate-500/20 dark:text-slate-400",
  };

  return styles[status] || "border bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400";
};

export const getTextColor = (status) => {
  const colors = {
    A: "#fee2e2", // dark orange
    P: "#15803d", // dark green
    M: "#374151", // dark gray
    LC: "#15803d",
    EG: "#15803d",
    O: "#c2410c",
    L: "#854d0e", // dark yellow-brown
    H: "#3730a3", // dark indigo
    V: "#3730a3",
  };
  return colors[status] || "#111827";
};

export const getRandomItem = (array) => {
  if (!array || array.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

export const generateSecurePassword = () => {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let retVal = "";

  // Ensure we get at least one of each for 100% strength
  retVal += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(Math.random() * 26));
  retVal += "0123456789".charAt(Math.floor(Math.random() * 10));
  retVal += "!@#$%^&*()".charAt(Math.floor(Math.random() * 10));

  for (let i = 0; i < length - 3; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle the result
  return retVal.split('').sort(() => 0.5 - Math.random()).join('');
};

export const getStrength = (password) => {
  if (!password) return { width: "0%", label: "None", color: "bg-slate-700", text: "text-slate-500" };

  let score = 0;
  if (password.length > 6) score++;         // 1
  if (password.length > 10) score++;        // 2
  if (/[A-Z]/.test(password)) score++;      // 3
  if (/[0-9]/.test(password)) score++;      // 4
  if (/[^A-Za-z0-9]/.test(password)) score++; // 5

  const levels = {
    0: { width: "5%", label: "Very Weak", color: "bg-red-600", text: "text-red-600" },
    1: { width: "20%", label: "Weak", color: "bg-red-500", text: "text-red-500" },
    2: { width: "40%", label: "Fair", color: "bg-orange-500", text: "text-orange-500" },
    3: { width: "60%", label: "Good", color: "bg-blue-500", text: "text-blue-500" },
    4: { width: "80%", label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" },
    5: { width: "100%", label: "Elite", color: "bg-emerald-400", text: "text-emerald-400" },
  };

  return levels[score];
};

export const notify = (title, text, type = 'success') => {
  return Swal.fire({
    title,
    text,
    icon: type,
    timer: type === 'success' ? 3000 : 5000,
    heightAuto: false,
  });
};

/**
 * Compresses an image file and returns a Base64 string.
 */
// export const compressImage = (file, { maxWidth = 600, maxHeight = 600, quality = 0.7 } = {}) => {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();

//     reader.onload = (event) => {
//       const img = new Image();
//       img.onload = () => {
//         let width = img.width;
//         let height = img.height;

//         // Maintain Aspect Ratio
//         if (width > maxWidth) {
//           height = (height * maxWidth) / width;
//           width = maxWidth;
//         }
//         if (height > maxHeight) {
//           width = (width * maxHeight) / height;
//           height = maxHeight;
//         }

//         const canvas = document.createElement("canvas");
//         canvas.width = width;
//         canvas.height = height;
//         const ctx = canvas.getContext("2d");
//         ctx.drawImage(img, 0, 0, width, height);

//         const compressedBase64 = canvas.toDataURL(file.type, quality);
//         resolve(compressedBase64);
//       };
//       img.onerror = (err) => reject(err);
//       img.src = event.target.result;
//     };
//     reader.onerror = (err) => reject(err);
//     reader.readAsDataURL(file);
//   });
// };


export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      // Returns the full data URL (e.g., data:image/jpeg;base64,...)
      resolve(reader.result);
    };

    reader.onerror = (err) => reject(err);

    // Reads the file as a Data URL for backend processing
    reader.readAsDataURL(file);
  });
};

/**
 * Converts minutes (number) to HH:MM (string)
 */
export const minutesToHHMM = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return "00:00";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Converts HH:MM (string) back to total minutes (number)
 */
export const hhmmToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;

  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
};

export const debounce = (func, delay) => {
  let timer;

  const debounced = function (...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(context, args), delay);
  };

  // Utility to stop the execution if needed
  debounced.cancel = () => {
    clearTimeout(timer);
  };

  return debounced;
};


// Helper: Capitalize strings
export const caps = (str) => {
  if (!str) return "---";
  return str.toString().replace(/\b\w/g, (c) => c.toUpperCase());
};

// Helper: Round numbers
export const numberRound = (val) => {
  if (val === 0) return 0;
  return val ? Number(val).toFixed(0) : "";
};

export const lastTenYears = () => {
  const year = new Date().getFullYear();
  // Wrap the object in parentheses to return it implicitly
  return Array.from({ length: 10 }, (_, i) => ({
    id: `${year - i}`,
    name: `${year - i}`,
  }));
}

export const getMonths = () => {
  return [
    { id: 1, name: "January" },
    { id: 2, name: "February" },
    { id: 3, name: "March" },
    { id: 4, name: "April" },
    { id: 5, name: "May" },
    { id: 6, name: "June" },
    { id: 7, name: "July" },
    { id: 8, name: "August" },
    { id: 9, name: "September" },
    { id: 10, name: "October" },
    { id: 11, name: "November" },
    { id: 12, name: "December" },
  ];
}


/**
 * Calculates years of service as a decimal (e.g., 3.2)
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {number}
 */
export function calculateYearsOfService(startDate, endDate = new Date()) {
  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();

  // Adjust if the month/day hasn't been reached yet in the current year
  if (months < 0 || (months === 0 && endDate.getDate() < startDate.getDate())) {
    years--;
    months += 12;
  }

  // Handle day-level precision for the "months" remainder
  if (endDate.getDate() < startDate.getDate()) {
    months--;
  }

  // Convert months to a decimal (rounded to 1 decimal place)
  const decimalMonths = Math.round((months / 12) * 10) / 10;

  return years + decimalMonths;
}


export const getSelectedMonthLabel = (selectedMonthRange) => {
  const fromMonth = selectedMonthRange?.from;
  const toMonth = selectedMonthRange?.to || fromMonth;

  if (!fromMonth || !toMonth) {
    return 'Select month range';
  }

  const [fromYear, fromMonthValue] = fromMonth.split('-').map(Number);
  const [toYear, toMonthValue] = toMonth.split('-').map(Number);

  const fromDate = new Date(fromYear, (fromMonthValue || 1) - 1, 1);
  const toDate = new Date(toYear, (toMonthValue || 1) - 1, 1);

  const start = fromDate <= toDate ? fromDate : toDate;
  const end = fromDate <= toDate ? toDate : fromDate;

  const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

export const getMonthBounds = (monthValueFrom, monthValueTo) => {
  const [yearFrom, monthFrom] = monthValueFrom.split('-').map(Number);
  const [yearTo, monthTo] = monthValueTo.split('-').map(Number);

  if (!yearFrom || !monthFrom || !yearTo || !monthTo) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from_date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      to_date: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
    };
  }

  const fromDate = new Date(yearFrom, monthFrom - 1, 1);
  const toDate = new Date(yearTo, monthTo, 0);

  const start = fromDate <= toDate ? fromDate : toDate;
  const end = fromDate <= toDate ? toDate : fromDate;

  return {
    from_date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    to_date: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  };
};