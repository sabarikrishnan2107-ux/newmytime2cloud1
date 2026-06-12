# Fire Alarm Popup — React Native Implementation Brief

**Goal:** Show a non-dismissible "Fire Alarm" popup in the mobile app whenever any
device for the logged-in company has an active alarm. The popup keeps showing
(with an alarm sound) until the user turns off the alarm on **every** triggered
device. This already exists in the web app — this brief is to replicate it in
React Native.

---

## 1. Backend APIs (already live — no backend changes needed)

Base URL = the **same API the mobile app already uses** for everything else.
Below, `{API_BASE}` = that base (e.g. `https://<your-domain>/api`).

### 1a. Poll for active alarms
```
GET  {API_BASE}/get_notifications_alarm?company_id={companyId}
```
- `company_id` = the logged-in user's company id (already in the app's auth/session).
- Returns a **JSON array of device objects** that currently have `alarm_status = 1`.
- Empty array `[]` = no active alarm → hide the popup + stop the sound.

**Sample response item** (each device, with nested `branch`):
```json
[
  {
    "id": 123,
    "name": "test222",
    "serial_number": "SN-00A21B",
    "alarm_status": 1,
    "alarm_start_datetime": "2026-06-01 15:06:00",
    "branch": {
      "branch_name": "test1",
      "location": "1st Floor"
    },
    "zone": { "...": "..." }
  }
]
```
Fields the popup uses: `id`, `name`, `serial_number`, `alarm_start_datetime`,
`branch.branch_name`, `branch.location`. (Treat any of them as possibly `null` →
show `—`.)

### 1b. Turn off the alarm on a device
```
POST {API_BASE}/update-device-alarm-status
Content-Type: application/json

{ "company_id": <companyId>, "serial_number": "<device serial_number>", "status": 0 }
```
- Sends the "close door / stop alarm" command to that physical device.
- After a successful call, **re-poll** (1a). When the array comes back empty, close the popup.

### 1c. Alarm sound file
```
GET  {API_ORIGIN}/alarm_sounds/alarm-sound1.mp3
```
- `{API_ORIGIN}` = the API base **without** the trailing `/api` (e.g. `https://<your-domain>`).
- Play it **looped** while the popup is open; stop when it closes.

---

## 2. Behavior spec (must match the web app exactly)

1. **Poll every 15 seconds** while the user is logged in (a global timer, app-wide —
   not tied to one screen).
2. If the response array has **≥1 device** → show the popup, start looping the alarm sound.
3. If the response is **empty** → hide the popup, stop the sound.
4. The popup is **non-dismissible**: tapping outside / Android back button must **not**
   close it. It closes only when there are no more active alarms.
5. **Multiple devices**: render one block per device, each with its own "Turn Off Alarm"
   button. The popup stays open until *all* are off.
6. **Turn Off Alarm** button:
   - Show a confirm prompt: *"Are you sure you want to TURN OFF the Alarm?"*
   - On confirm → call 1b for that device's `serial_number`, show a "Turning off…"
     loading state on that button, then re-poll.
7. Show the static note **"All branch doors opened"** and the hint
   *"Turn off the alarm on each device to close this popup."*
8. Handle network errors silently — just retry on the next 15s poll (don't crash, don't
   show an error toast spam).

---

## 3. UI design (the "modern alert card")

Match the web app's look:

- **Card**: rounded corners (~20px), dark surface (`#0F172A`), red border/halo glow.
- **Header bar**: red gradient (`#B91C1C → #DC2626 → #EF4444`), flame icon in a translucent
  white circle, title **"Fire Alarm Notification"** (bold, white), and a small
  **"● ACTIVE"** pill (blinking dot) on the right.
- **Per device block**:
  - A flame icon in a rounded red-tinted square (gently pulsing).
  - Small red line: 🕐 `Triggered at {formatted time}`.
  - Large bold **device name** as the headline.
  - Label/value rows: **Branch**, **Location**, **Serial**.
  - Red gradient **"⏻ Turn Off Alarm"** button (right-aligned). Disabled + "Turning off…"
    while the request is in flight.
- **Footer**: green chip **"✓ All branch doors opened"** + grey hint text.
- **Time format**: `HH:mm Wkd, Mon DD, YYYY` → e.g. `15:06 Mon, Jun 01 2026`.
- **Dark/light aware** if the app supports themes (card stays dark-styled either way is fine).
- Respect "reduce motion" if easy (skip the pulse/glow animations).

---

## 4. Libraries needed (pick per the app's setup)

| Need            | Expo app                          | Bare React Native                          |
|-----------------|-----------------------------------|--------------------------------------------|
| Looping sound   | `expo-av` (`Audio.Sound`, `isLooping`) | `react-native-sound`                  |
| Modal           | RN built-in `<Modal>` (`transparent`, no backdrop dismiss) | same |
| Icons           | `lucide-react-native` or `@expo/vector-icons` | `react-native-vector-icons` |
| HTTP            | whatever the app already uses (axios/fetch) | same                              |

> Keep it consistent with what the app already has installed — don't add a second icon/http lib.

---

## 5. Where to mount it

Render the popup **once at the app root**, above the navigator (e.g. inside the root
`App` component / a top-level provider), so it overlays every authenticated screen.
It should only run while the user is logged in (guard the poll on auth state +
`company_id` being available).

---

## 6. Reference implementation (skeleton — adapt the marked `// TODO` spots)

> This is React Native pseudocode to convey logic + structure. Replace auth/sound/http
> integration points with the app's own helpers.

```jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
// import { Audio } from "expo-av";                 // Expo
// import Sound from "react-native-sound";          // bare RN
// import { Flame, Power, Clock, Check } from "lucide-react-native";

const POLL_MS = 15000;
const API_BASE = "<API_BASE>";                       // TODO: from app config
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const ALARM_SOUND = `${API_ORIGIN}/alarm_sounds/alarm-sound1.mp3`;

function formatAlarmTime(value) {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));       // backend sends "YYYY-MM-DD HH:mm:ss"
  if (isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const date = d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "2-digit" });
  return `${time} ${date}`;
}

export default function FireAlarmPopup() {
  const [devices, setDevices] = useState([]);
  const [turningOff, setTurningOff] = useState(null);
  const soundRef = useRef(null);
  const inFlight = useRef(false);

  const playSound = useCallback(async () => {
    // TODO: load + loop ALARM_SOUND once; play. Swallow errors.
  }, []);
  const stopSound = useCallback(async () => {
    // TODO: pause/stop + reset.
  }, []);

  const checkAlarms = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const companyId = /* TODO: app auth */ 0;
      if (!companyId) { setDevices([]); return; }
      const res = await fetch(`${API_BASE}/get_notifications_alarm?company_id=${companyId}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) { setDevices(data); playSound(); }
      else { setDevices([]); stopSound(); }
    } catch { /* retry next tick */ }
    finally { inFlight.current = false; }
  }, [playSound, stopSound]);

  useEffect(() => {
    checkAlarms();
    const id = setInterval(checkAlarms, POLL_MS);
    return () => { clearInterval(id); stopSound(); };
  }, [checkAlarms, stopSound]);

  const handleTurnOff = (device) => {
    if (!device?.serial_number) return;
    Alert.alert("Turn Off Alarm", "Are you sure you want to TURN OFF the Alarm?", [
      { text: "Cancel", style: "cancel" },
      { text: "Turn Off", style: "destructive", onPress: async () => {
          setTurningOff(device.serial_number);
          try {
            const companyId = /* TODO */ 0;
            await fetch(`${API_BASE}/update-device-alarm-status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ company_id: companyId, serial_number: device.serial_number, status: 0 }),
            });
            await checkAlarms();
          } catch { /* keep popup open; user can retry */ }
          finally { setTurningOff(null); }
      }},
    ]);
  };

  if (devices.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      {/* onRequestClose = no-op → Android back can't dismiss */}
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header: flame + "Fire Alarm Notification" + ACTIVE pill */}
          <ScrollView>
            {devices.map((d, i) => (
              <View key={d.id ?? i} style={styles.deviceBlock}>
                {/* flame icon */}
                <Text style={styles.triggered}>Triggered at {formatAlarmTime(d.alarm_start_datetime)}</Text>
                <Text style={styles.deviceName}>{d.name ?? "—"}</Text>
                {/* rows: Branch / Location / Serial */}
                <TouchableOpacity
                  disabled={turningOff === d.serial_number}
                  onPress={() => handleTurnOff(d)}
                  style={styles.turnOffBtn}
                >
                  <Text style={styles.turnOffText}>
                    {turningOff === d.serial_number ? "Turning off…" : "Turn Off Alarm"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {/* footer: "All branch doors opened" chip + hint */}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 560, borderRadius: 20, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "rgba(239,68,68,0.5)", overflow: "hidden" },
  deviceBlock: { padding: 20 },
  triggered: { color: "#F87171", fontWeight: "600", fontSize: 13 },
  deviceName: { color: "#fff", fontWeight: "800", fontSize: 20, marginTop: 2 },
  turnOffBtn: { alignSelf: "flex-end", backgroundColor: "#DC2626", paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, marginTop: 16 },
  turnOffText: { color: "#fff", fontWeight: "700" },
});
```

---

## 7. Acceptance criteria

- [ ] Popup appears within ~15s of an alarm firing, on whatever screen the user is on.
- [ ] Alarm sound loops while open; stops when closed.
- [ ] Cannot be dismissed by tapping outside or the Android back button.
- [ ] Each triggered device shown with name, branch, location, serial, trigger time.
- [ ] "Turn Off Alarm" prompts for confirmation, calls the API, shows loading, re-polls.
- [ ] Popup closes automatically once all devices are off (poll returns `[]`).
- [ ] Survives network errors (retries silently next poll).
- [ ] Visual style matches the web "modern alert card" (red glow card, header, green footer chip).

---

### One thing to confirm with whoever owns the backend
The poll endpoint is unauthenticated-by-`company_id` (it just filters on the
`company_id` query param). If the mobile app sends an auth token on other calls,
include it here too for consistency — but functionally only `company_id` is required.
