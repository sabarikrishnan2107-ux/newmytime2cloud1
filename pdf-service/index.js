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
app.use("/templates", express.static(path.resolve(__dirname, "..", "summary-report"), NO_CACHE_STATIC));
app.use("/attendance-report", express.static(path.resolve(__dirname, "..", "summary-report", "attendance-report"), NO_CACHE_STATIC));
app.use("/access-control-report", express.static(path.resolve(__dirname, "..", "summary-report", "access-control-report"), NO_CACHE_STATIC));

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
    "--no-zygote",
    "--single-process",           // keeps the process count flat; helps on low-RAM VMs
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
  protocolTimeout: 300000,
};

let browserPromise = null;

async function getBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b.isConnected()) return b;
    } catch (_) {
      // fall through — relaunch below
    }
  }
  browserPromise = puppeteer.launch(BROWSER_LAUNCH_OPTS).then((b) => {
    console.log("Chromium launched (pid=" + b.process()?.pid + ")");
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

app.post("/pdf", async (req, res) => {
  req.setTimeout(300000);
  res.setTimeout(300000);
  const { url, landscape, format } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  console.log("Generating PDF for:", url);
  await acquireSlot();
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Always bypass HTTP cache — report templates change frequently and we
    // never want a stale render. Without this, puppeteer's persistent disk
    // cache can serve an old static template even after the file on disk
    // has been updated.
    await page.setCacheEnabled(false);
    await page.setExtraHTTPHeaders({ "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache" });

    const isLandscapeView = landscape === true || url.includes("attendance-report") || url.includes("access-control-report");
    await page.setViewport({ width: isLandscapeView ? 1400 : 1280, height: 900 });

    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
    page.on("requestfailed", (req) => console.log("FAILED REQUEST:", req.url()));

    console.log("Loading page...");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 300000 });
    console.log("Page loaded (networkidle2)");

    if (isLandscapeView) {
      await page.addStyleTag({ content: "@page { size: A4 landscape !important; }" });
    }

    try {
      await page.waitForSelector("table tbody tr", { timeout: 30000 });
      console.log("Table rows found");
    } catch (e) {
      console.log("No table rows found, waiting extra time...");
    }

    await new Promise((r) => setTimeout(r, 2000));

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
    // For daily-report, use the @page margins from the HTML (they reserve room for footer).
    // For everything else, keep the legacy 5mm margins.
    const pdfOptions = {
      format: format || "A4",
      landscape: isLandscapeView,
      printBackground: true,
      preferCSSPageSize: isDailyReport,
      margin: isDailyReport
        ? undefined
        : { top: "5mm", bottom: "5mm", left: "5mm", right: "5mm" },
    };
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
    const pdf = await page.pdf(pdfOptions);

    console.log("PDF generated:", pdf.length, "bytes");
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": "attachment" });
    res.send(pdf);
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
    res.json({ ok: true, chromium: b.isConnected(), inflight, queued: queue.length });
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

const PORT = 3002;
app.listen(PORT, () => console.log(`PDF service running on http://localhost:${PORT}`));
