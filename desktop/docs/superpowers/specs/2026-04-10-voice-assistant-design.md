# Voice Assistant Design - MyTime2Cloud

**Date:** 2026-04-10
**Scope:** Admin dashboard only
**Approach:** 100% browser-based (no external AI APIs)

## Architecture

```
User speaks → Web Speech API (STT)
  → Wake word detection ("Hey MyTime")
  → Intent matcher (JS pattern matching)
  → Navigation? → Next.js router.push()
  → Data query? → Laravel API call → Show popup
  → Response → Browser SpeechSynthesis (TTS)
```

## Components

| File | Purpose |
|------|---------|
| `components/Voice/VoiceButton.jsx` | Floating mic button bottom-right |
| `components/Voice/VoicePanel.jsx` | Popup: transcript, results, history |
| `hooks/useVoiceRecognition.js` | Web Speech API, wake word, silence timer |
| `hooks/useTextToSpeech.js` | Browser SpeechSynthesis |
| `lib/voice/intentMatcher.js` | Maps speech to intents |
| `lib/voice/commandExecutor.js` | Executes API calls, formats data |
| `lib/voice/commands.js` | Command definitions with API mappings |

## Command Types

### Navigation Commands
| Trigger Words | Route |
|--------------|-------|
| "show attendance", "open attendance" | /attendance |
| "show employees", "employee list" | /employees |
| "open schedule" | /schedule |
| "show holidays" | /holiday |
| "open leave", "leave dashboard" | /leave-dashboard |
| "show reports" | /report |
| "open cameras", "live camera" | /live-camera |
| "open setup" | /setup |
| "show shift" | /shift |
| "show devices" | /device |
| "open dashboard" | / |

### Data Query Commands
| Trigger Words | API Endpoint | Response |
|--------------|-------------|----------|
| "today absent list" | GET /attendances (status=A) | Employee names list |
| "today present count" | GET /attendances (status=P) | Count number |
| "show late comers" | GET /attendances (late) | Employee names list |
| "attendance summary" | GET /attendances (grouped) | P/A/L/O/H counts |
| "leave requests" | GET /employee_leaves (pending) | Pending list |
| "change requests" | GET /change-requests (pending) | Pending list |
| "who is on leave" | GET /employee_leaves (today) | Employee names |
| "how many employees" | GET /employees (count) | Total count |
| "upcoming holidays" | GET /holidays | Holiday list |

## Wake Word
- Triggers: "hey mytime", "hi mytime", "hey my time", "hi my time"
- Continuous listening for wake word only
- After wake word detected, listens for command (8s silence timeout)

## Multi-Language
- Web Speech API handles: English (en), Tamil (ta), Arabic (ar), French (fr)
- Auto-detects input language
- Responds in same language using SpeechSynthesis

## UI Design
- Floating mic button: bottom-right, 56px circle, primary color
- Voice panel: 400px wide, above mic button
- States: idle, listening (wake word), active (command), processing, showing results
- Listening animation: pulsing rings
- Transcript shown live
- Results in scrollable card
- History of last 5 interactions

## Security
- Commands execute only when speech confidence > 0.7
- Data queries require valid auth token (from localStorage)
- Admin-only: component only renders in admin layout
