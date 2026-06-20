const express = require("express");
const cors = require("cors");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "10mb" }));
const NO_CACHE_STATIC = {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
  },
};
app.use("/templates", express.static(path.resolve(__dirname, "..", "..", "summary-report"), NO_CACHE_STATIC));
app.use("/attendance-report", express.static(path.resolve(__dirname, "..", "..", "summary-report", "attendance-report"), NO_CACHE_STATIC));
app.use("/daily-report", express.static(path.resolve(__dirname, "..", "..", "summary-report", "daily-report"), NO_CACHE_STATIC));
app.use("/access-control-report", express.static(path.resolve(__dirname, "..", "..", "summary-report", "access-control-report"), NO_CACHE_STATIC));
app.use("/absent-report", express.static(path.resolve(__dirname, "..", "..", "summary-report", "absent-report"), NO_CACHE_STATIC));
app.use("/live-tracker-report", express.static(path.resolve(__dirname, "..", "..", "summary-report", "live-tracker-report"), NO_CACHE_STATIC));

// -----------------------------------------------------------------------------
// Shared browser instance.
// Launching Chromium per-request pegged the server at ~70% CPU under load.
// Instead we launch once at boot, reuse across requests via browser.newPage(),
// and auto-relaunch if the process ever dies (crash / OOM / manual kill).
// -----------------------------------------------------------------------------
const BROWSER_LAUNCH_OPTS = {
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-web-security",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    // NOTE: --single-process / --no-zygote were removed — on Windows desktop they
    // make Chromium crash during Page.printToPDF ("Target closed"), even for tiny
    // reports. A normal multi-process renderer is stable and the machine has RAM.
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
  protocolTimeout: 300000,
};

let browserPromise = null;

// Recycle Chromium proactively after this many successful PDFs to prevent the
// long-running-process state accumulation that causes "detached Frame" errors
// and slow memory growth. Tunable via env var.
const MAX_REQUESTS_PER_BROWSER = Number(process.env.PDF_MAX_REQUESTS_PER_BROWSER || 50);
let browserRequestCount = 0;
let browserStartedAt = 0;
let totalPdfsServed = 0;
let totalRetries = 0;
let totalRecycles = 0;

async function getBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b.isConnected()) {
        // Proactive recycle when we've used the same browser too many times.
        if (browserRequestCount >= MAX_REQUESTS_PER_BROWSER) {
          console.log(`Browser hit ${browserRequestCount} requests, recycling proactively`);
          totalRecycles++;
          await recycleBrowser();
        } else {
          return b;
        }
      }
    } catch (_) {
      // fall through — relaunch below
    }
  }
  browserRequestCount = 0;
  browserPromise = puppeteer.launch(BROWSER_LAUNCH_OPTS).then((b) => {
    console.log("Chromium launched (pid=" + b.process()?.pid + ")");
    browserStartedAt = Date.now();
    b.on("disconnected", () => {
      console.warn("Chromium disconnected — next request will relaunch");
      browserPromise = null;
    });
    return b;
  }).catch((err) => {
    browserPromise = null;
    throw err;
  });
  return browserPromise;
}

// Simple concurrency gate — prevents the server being overwhelmed by simultaneous
// PDF requests (each one still holds a full page + renderer thread).
const MAX_CONCURRENT = Number(process.env.PDF_MAX_CONCURRENT || 3);
let inflight = 0;
const queue = [];
function acquireSlot() {
  return new Promise((resolve) => {
    const grant = () => { inflight++; resolve(); };
    if (inflight < MAX_CONCURRENT) grant();
    else queue.push(grant);
  });
}
function releaseSlot() {
  inflight--;
  const next = queue.shift();
  if (next) next();
}

// Errors that indicate the browser/page is in a bad state and we should retry
// on a fresh browser. Common Puppeteer variants:
//   "Attempted to use detached Frame ..."
//   "Navigating frame was detached"
//   "Frame was detached"
//   "Target closed"
//   "Session closed"
//   "Protocol error (...): Target closed"
//   "Connection closed"
//   "Execution context was destroyed"
// All point to the same root cause: the browser was disconnected/recycled
// mid-operation but getBrowser() returned a stale handle.
function isTransientBrowserError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("detached") ||              // covers all "detached frame" / "frame was detached" variants
    msg.includes("target closed") ||
    msg.includes("session closed") ||
    msg.includes("protocol error") ||
    msg.includes("connection closed") ||
    msg.includes("execution context was destroyed") ||
    msg.includes("navigation failed because browser has disconnected")
  );
}

async function recycleBrowser() {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch (_) {
    // ignore — we're going to relaunch anyway
  }
  browserPromise = null;
}

app.post("/pdf", async (req, res) => {
  req.setTimeout(300000);
  res.setTimeout(300000);
  const { url, landscape, format } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  console.log("Generating PDF for:", url);
  await acquireSlot();
  let page;
  let attempt = 0;
  const MAX_ATTEMPTS = 2;
  try {
    while (true) {
      attempt++;
      try {
        const browser = await getBrowser();
        page = await browser.newPage();

    // Always bypass HTTP cache — report templates change frequently and we
    // never want a stale render. Without this, puppeteer's persistent disk
    // cache can serve an old static template even after the file on disk
    // has been updated.
    await page.setCacheEnabled(false);
    await page.setExtraHTTPHeaders({ "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache" });

    const isLandscapeView = landscape === true || url.includes("attendance-report") || url.includes("access-control-report") || url.includes("absent-report") || url.includes("live-tracker-report");
    await page.setViewport({ width: isLandscapeView ? 1400 : 1280, height: 900 });

    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
    page.on("requestfailed", (req) => console.log("FAILED REQUEST:", req.url()));

    console.log("Loading page...");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 300000 });
    console.log("Page loaded (networkidle2)");

    if (isLandscapeView) {
      await page.addStyleTag({ content: "@page { size: A4 landscape !important; }" });
    }

    // Wait for the report's data to actually render before printing.
    // The React-less templates (format-b/c) show a ".loading" placeholder
    // ("Loading report…") inside #root until their fetch resolves, then swap in
    // the table (or an ".error" div on failure). Relying on networkidle2 alone
    // RACES: the page can be network-idle for a beat BEFORE the fetch fires,
    // so we'd capture the placeholder and emit a blank "Loading report…" PDF.
    // Prefer the explicit placeholder signal; fall back to waiting for table
    // rows for templates that don't use it.
    const READY_TIMEOUT = Number(process.env.PDF_READY_TIMEOUT || 120000);
    const usesLoadingPlaceholder = await page.evaluate(() => !!document.querySelector(".loading"));
    try {
      if (usesLoadingPlaceholder) {
        await page.waitForFunction(() => !document.querySelector(".loading"), { timeout: READY_TIMEOUT, polling: 250 });
        console.log("Loading placeholder cleared");
      } else {
        await page.waitForSelector("table tbody tr", { timeout: 30000 });
        console.log("Table rows found");
      }
    } catch (e) {
      if (usesLoadingPlaceholder) {
        throw new Error(`Report did not finish loading within ${READY_TIMEOUT}ms — the dataset may be too large or the API too slow.`);
      }
      console.log("No table rows found, waiting extra time...");
    }

    // Surface a template-rendered error instead of silently printing it to PDF.
    const renderError = await page.evaluate(() => {
      const el = document.querySelector(".error");
      return el ? (el.innerText || "").trim() : null;
    });
    if (renderError) throw new Error("Report failed to load: " + renderError);

    await new Promise((r) => setTimeout(r, 1500));

    const info = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      const rows = document.querySelectorAll("table tbody tr");
      const body = document.body;
      return {
        tables: tables.length,
        rows: rows.length,
        bodyHeight: body.scrollHeight,
        bodyWidth: body.scrollWidth,
        title: document.title,
        rootHTML: document.getElementById("root")?.innerHTML?.substring(0, 200) || "EMPTY",
      };
    });
    console.log("Page info:", JSON.stringify(info));

    const isDailyReport = url.includes("daily-report");
    const isAbsentDaily = url.includes("absent-report/daily");
    const isAbsentMonthly = url.includes("absent-report/monthly");
    const isAbsentReport = isAbsentDaily || isAbsentMonthly;
    const isLiveTrackerReport = url.includes("live-tracker-report");
    // For daily-report, absent-report, and live-tracker-report use the @page margins from the HTML (they reserve room for footer).
    // For everything else, keep the legacy 5mm margins.
    const pdfOptions = {
      format: format || "A4",
      landscape: isLandscapeView,
      printBackground: true,
      preferCSSPageSize: isDailyReport || isAbsentReport || isLiveTrackerReport,
      margin: (isDailyReport || isAbsentReport || isLiveTrackerReport)
        ? undefined
        : { top: "5mm", bottom: "5mm", left: "5mm", right: "5mm" },
    };
    if (isLiveTrackerReport) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = '<div></div>';
      pdfOptions.footerTemplate = `
        <div style="font-size: 8pt; color: #64748b; width: 100%; padding: 0 10mm; font-family: 'Inter', Helvetica, Arial, sans-serif;">
          <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; width: 100%;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="text-align: left; width: 40%;">
                  <span style="color:#16a34a">&#9679;</span> Completed, &nbsp;
                  <span style="color:#ef4444">&#9679;</span> Live, &nbsp;
                  <span style="color:#f59e0b">&#9679;</span> Partial GPS, &nbsp;
                  <span style="color:#ef4444">&#9733;</span> Over 100 km
                </td>
                <td style="text-align: center; width: 30%;">
                  Powered by: <strong style="color:#4f46e5">MyTime2Cloud</strong>
                </td>
                <td style="text-align: right; width: 30%;">
                  Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }
    if (isDailyReport) {
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = '<div></div>';
      pdfOptions.footerTemplate = `
        <div style="font-size: 8pt; color: #6b7280; width: 100%; padding: 0 10mm; font-family: Helvetica, Arial, sans-serif;">
          <div style="border-top: 1px solid #64748b; padding-top: 5px; width: 100%;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="text-align: left; width: 40%;">
                  <span style="color:#16a34a">P</span> = Present,
                  <span style="color:#dc2626">A</span> = Absent,
                  <span style="color:#2563eb">O</span> = WeekOff,
                  <span style="color:#ca8a04">L</span> = Leave
                </td>
                <td style="text-align: center; width: 30%;">Powered by: <strong>MyTime2Cloud</strong></td>
                <td style="text-align: right; width: 30%;">
                  Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }
    if (isAbsentReport) {
      const meta = await page.evaluate(() => ({
        totalCount: document.body.dataset.totalCount || '0',
        totalEmployees: document.body.dataset.totalEmployees || '0',
      }));
      pdfOptions.displayHeaderFooter = true;
      pdfOptions.headerTemplate = '<div></div>';

      if (isAbsentDaily) {
        const dailyLeft = `Showing ${meta.totalCount} of ${meta.totalEmployees} absentees. Sorted: unapproved / longest streak first. Streak = consecutive days absent.`;
        pdfOptions.footerTemplate = `
          <div style="font-size: 8pt; color: #6b7280; width: 100%; padding: 0 10mm; font-family: Helvetica, Arial, sans-serif;">
            <div style="border-top: 1px solid #e5e7eb; padding-top: 6px; width: 100%;">
              <div style="text-align: center; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.4px;">
                <span style="color:#b91c1c">&#9679;</span> NO-SHOW &nbsp;&nbsp;
                <span style="color:#c2410c">&#9679;</span> LOP &nbsp;&nbsp;
                <span style="color:#854d0e">&#9679;</span> CASUAL LEAVE &nbsp;&nbsp;
                <span style="color:#92400e">&#9679;</span> SICK LEAVE &nbsp;&nbsp;
                <span style="color:#1d4ed8">&#9679;</span> PERMISSION &nbsp;&nbsp;
                <span style="color:#047857">&#9679;</span> APPROVED
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: left; width: 60%;">${dailyLeft}</td>
                  <td style="text-align: right; width: 40%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span> &nbsp;·&nbsp; Daily Absent Report</td>
                </tr>
              </table>
            </div>
          </div>
        `;
      } else {
        const monthlyLeft = `Showing top ${meta.totalCount} of ${meta.totalCount} employees with absences. Streak = longest consecutive absent days in the period.`;
        pdfOptions.footerTemplate = `
          <div style="font-size: 8pt; color: #6b7280; width: 100%; padding: 0 10mm; font-family: Helvetica, Arial, sans-serif;">
            <div style="border-top: 1px solid #e5e7eb; padding-top: 6px; width: 100%;">
              <div style="text-align: center; margin-bottom: 4px; font-weight: 600; letter-spacing: 0.4px;">
                <span style="color:#047857">&#9679;</span> APPROVED LEAVE &nbsp;&nbsp;
                <span style="color:#be123c">&#9679;</span> UNAPPROVED / NO-SHOW &nbsp;&nbsp;
                <span style="color:#6b7280; font-weight: 400;">Sorted by Total Absent &darr; — worst absentees on top</span>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: left; width: 60%;">${monthlyLeft}</td>
                  <td style="text-align: right; width: 40%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span> &nbsp;·&nbsp; Monthly Absent Report</td>
                </tr>
              </table>
            </div>
          </div>
        `;
      }
    }
    // Hard cap on the pdf() call so a wedged renderer can't pin this worker slot.
    const pdf = await Promise.race([
      page.pdf(pdfOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("page.pdf() hard timeout after 90s")), 90000)
      ),
    ]);

    console.log("PDF generated:", pdf.length, "bytes");
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": "attachment" });
    res.send(pdf);
        browserRequestCount++;
        totalPdfsServed++;
        break; // success — exit retry loop
      } catch (err) {
        // close the bad page so we don't leak handles
        if (page) {
          try { await page.close(); } catch (_) {}
          page = null;
        }
        // retry once on transient browser-state errors (detached frame, target closed, etc.)
        if (attempt < MAX_ATTEMPTS && isTransientBrowserError(err)) {
          console.warn(`Transient browser error on attempt ${attempt}/${MAX_ATTEMPTS}, recycling and retrying: ${err.message}`);
          totalRetries++;
          await recycleBrowser();
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    console.error("PDF error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    releaseSlot();
  }
});

// Health probe so you can `curl /healthz` to confirm the browser is warm.
app.get("/healthz", async (_req, res) => {
  try {
    const b = await getBrowser();
    const mem = process.memoryUsage();
    res.json({
      ok: true,
      chromium: b.isConnected(),
      chromium_pid: b.process()?.pid ?? null,
      browser_age_ms: browserStartedAt ? Date.now() - browserStartedAt : 0,
      requests_on_current_browser: browserRequestCount,
      max_requests_per_browser: MAX_REQUESTS_PER_BROWSER,
      total_pdfs_served: totalPdfsServed,
      total_retries: totalRetries,
      total_recycles: totalRecycles,
      inflight,
      queued: queue.length,
      max_concurrent: MAX_CONCURRENT,
      node_rss_mb: Math.round(mem.rss / 1024 / 1024),
      node_heap_mb: Math.round(mem.heapUsed / 1024 / 1024),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Warm the browser at boot so the first real request doesn't pay the launch cost.
getBrowser().catch((err) => console.error("Initial browser launch failed:", err.message));

// Graceful shutdown — close Chromium cleanly on SIGTERM (systemd) / SIGINT (Ctrl-C).
async function shutdown(sig) {
  console.log("Received " + sig + ", shutting down...");
  if (browserPromise) {
    try { const b = await browserPromise; await b.close(); } catch (_) {}
  }
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const PORT = Number(process.env.PDF_PORT) || 3002;
app.listen(PORT, () => console.log(`PDF service running on http://localhost:${PORT}`));
