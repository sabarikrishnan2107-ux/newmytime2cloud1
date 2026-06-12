const express = require('express');
const cors = require('cors');
const ical = require('node-ical');
const axios = require('axios');

const app = express();
const HOST = "0.0.0.0";
const PORT = 4000;   // must match frontend NEXT_PUBLIC_SYNC_CALENDAR_URL (:4000)

app.use(cors());

// Country code → Google Calendar regional-holidays ICS feed.
// Add more as needed; the PHP side just passes whatever country_code the branch
// has on file, so any country in this map is supported automatically.
const CALENDAR_IDS = {
  AE: 'en.ae',
  IN: 'en.indian',
  SA: 'en.sa',
  US: 'en.usa',
  GB: 'en.uk',
  AU: 'en.australian',
  CA: 'en.canadian',
  DE: 'en.german',
  FR: 'en.french',
  JP: 'en.japanese',
  SG: 'en.singapore',
  MY: 'en.malaysia',
  PH: 'en.philippines',
  ID: 'en.indonesian',
  BH: 'en.bh',
  KW: 'en.kw',
  OM: 'en.om',
  QA: 'en.qa',
  EG: 'en.eg',
  PK: 'en.pk',
  BD: 'en.bd',
  LK: 'en.lk',
};

function buildIcsUrl(calendarId) {
  const encoded = encodeURIComponent(`${calendarId}#holiday@group.v.calendar.google.com`);
  return `https://calendar.google.com/calendar/ical/${encoded}/public/basic.ics`;
}

app.get('/health', (_req, res) => res.json({ status: true }));

app.get('/holidays/:year', async (req, res) => {
  const selectedYear = parseInt(req.params.year, 10);
  const country = String(req.query.country || 'AE').toUpperCase();
  const calendarId = CALENDAR_IDS[country];

  if (!calendarId) {
    return res.status(404).json({ error: `No Google Calendar mapping for country '${country}'` });
  }

  try {
    const response = await axios.get(buildIcsUrl(calendarId), { timeout: 15000 });
    const data = ical.parseICS(response.data);

    let rawHolidays = [];
    for (const k in data) {
      const event = data[k];
      if (event.type !== 'VEVENT') continue;
      const startDate = new Date(event.start);
      const name = event.summary || '';

      if (startDate.getFullYear() !== selectedYear) continue;

      // Observances that clutter output and aren't actual public holidays
      // (UAE Ramadan/Hajj markers were filtered in the original implementation).
      const lower = name.toLowerCase();
      if (country === 'AE' && (lower.includes('ramadan') || lower.includes('hajj'))) continue;

      rawHolidays.push({
        date: startDate.toISOString().split('T')[0],
        cleanName: name.replace(/\(tentative\)|Holiday/gi, '').trim(),
      });
    }

    rawHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Collapse consecutive same-name entries into a single multi-day range.
    const finalPayloads = [];
    rawHolidays.forEach((item) => {
      const last = finalPayloads[finalPayloads.length - 1];
      if (last && last.name === item.cleanName) {
        last.end_date = item.date;
        const diff = Math.abs(new Date(last.end_date) - new Date(last.start_date));
        last.total_days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
      } else {
        finalPayloads.push({
          name: item.cleanName,
          total_days: 1,
          start_date: item.date,
          end_date: item.date,
          year: selectedYear,
        });
      }
    });

    res.json(finalPayloads);
  } catch (error) {
    res.status(500).json({ error: "Failed to process holidays", details: error.message });
  }
});

// Introspection endpoint so the PHP side can confirm supported country codes.
app.get('/holidays/countries/list', (_req, res) => {
  res.json({ countries: Object.keys(CALENDAR_IDS) });
});

app.listen(PORT, HOST, () => {
  console.log(`API is live on http://${HOST}:${PORT}/holidays/2026?country=IN`);
});
