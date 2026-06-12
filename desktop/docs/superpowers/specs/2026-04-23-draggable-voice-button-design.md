# Draggable Voice Button — Design

## Goal

Make the floating voice-assistant mic button draggable to any position on screen, persist that position across reloads, and reduce its size slightly so it feels less obtrusive.

## Current State

[frontend-new/src/components/Voice/VoiceButton.jsx](../../../frontend-new/src/components/Voice/VoiceButton.jsx) renders a fixed circular button at `bottom-6 right-6` (`w-14 h-14`, 56px) with a 22px Lucide `Mic` icon. Click toggles the voice panel and starts/stops listening. A hover tooltip ("Voice Assistant" / "Stop Listening") is anchored above-right of the button.

## Changes

### 1. Size reduction

- Button: `w-14 h-14` → `w-12 h-12` (56px → 48px).
- Icon: `size={22}` → `size={18}` for both `Mic` and `MicOff`.
- Container `bottom-6 right-6` is replaced by an inline-styled wrapper (see below) when a custom position is set; the default still places the button at the same bottom-right offset.

### 2. Drag behavior

- New state: `position` of shape `{ x: number, y: number } | null`. `null` means "use default bottom-right".
- On mount, read `localStorage.getItem("voiceButtonPosition")`. If a valid `{x, y}` is parsed and lies within the current viewport, hydrate `position`. Otherwise leave `null`.
- The button container becomes:
  - When `position === null`: `className="fixed bottom-6 right-6 z-[9999]"` (current behavior).
  - When `position` is set: `className="fixed z-[9999]"` with `style={{ left: position.x, top: position.y }}`.
- Drag is implemented with native pointer events on the button:
  - `onPointerDown`: capture pointer, record `startX/startY` (pointer coords) and `originX/originY` (current button top-left in px — derived from `getBoundingClientRect`). Set `isPointerDown = true`, reset `didDrag = false`.
  - `onPointerMove` (window): if `!isPointerDown` ignore. Compute `dx, dy` from start. If `Math.hypot(dx, dy) > 5` and `!didDrag`, set `didDrag = true` (drag threshold). When dragging, set `position` to `{ x: clamp(originX + dx, 0, vw - btnW), y: clamp(originY + dy, 0, vh - btnH) }` so the button stays fully on-screen.
  - `onPointerUp` (window): release pointer capture. If `didDrag`, persist `position` to `localStorage`. Always clear `isPointerDown`.
- The existing `onClick` (mic toggle) only fires when `didDrag === false`. Implement by checking a ref inside the click handler and calling `event.preventDefault()` + early return when a drag just happened. (Use a ref, not state, so the click handler sees the latest value within the same event loop turn.)
- Add `style={{ touchAction: "none" }}` to the button so touch drags don't scroll the page.
- Hide the hover tooltip while dragging (`!didDrag` guard on the `<span>`'s render or visibility).

### 3. Viewport resize handling

On `window.resize`, if a saved `position` now falls outside the viewport (e.g. window shrunk), clamp it back inside and update `localStorage`. Cheap effect with a single resize listener.

## Out of scope

- No drag handle vs. body distinction — the whole button is draggable.
- No snap-to-edge or grid behavior.
- No animation on drop (keep `transition-all duration-300` already on the button; CSS handles the feel).
- No per-user server-side persistence — `localStorage` is fine.
- No changes to the voice panel itself.

## Files touched

- [frontend-new/src/components/Voice/VoiceButton.jsx](../../../frontend-new/src/components/Voice/VoiceButton.jsx) — only file modified.

## Risks

- **SSR/hydration mismatch:** `localStorage` access must happen in `useEffect`, not during render, or Next.js will mismatch. Initial render uses `position = null` (default corner); the effect hydrates after mount.
- **Pointer capture on unmount:** cleanup removes window listeners on unmount to avoid stale references.
- **Click vs. drag edge case:** the 5px threshold is the standard heuristic; verified by the `didDrag` ref pattern.
