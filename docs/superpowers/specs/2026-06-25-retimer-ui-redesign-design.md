# ReTimer UI Redesign — Fitness Rings Style

**Date:** 2026-06-25  
**Status:** Approved

## Goal

Redesign ReTimer to feel like a high-quality Apple app. The core move: replace color-flooded card backgrounds and the traffic-light dot with a circular progress arc (inspired by Apple Activity rings). Status color is expressed through the arc stroke and status text only — card surfaces stay neutral.

---

## 1. TrackerCard

### Layout

```
┌─────────────────────────────────────┐
│  Ibuprofen                  ╭──────╮│
│  Health                    │  arc  ││
│                            │       ││
│  Wait 4h 12m                ╰──────╯│
│  Today 2:30 PM                      │
│  ┌─────────────────────────────┐   │
│  │           Log               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Arc Ring

- Diameter: 52pt, stroke width: 5pt
- Background track: `borderDark` / `border` color at low opacity
- Foreground arc: status color (red / yellow / green)
- Arc fill progress: `elapsedSeconds / (cooldownMax * 60)`, clamped to 0–1
- Never-logged state: empty track with a neutral gray foreground arc at 0
- Overdue state: arc fully filled (1.0) + a small `!` badge overlaid at the top-right of the ring

### Card Surface

- Background: always `colors.surface` (light) / `colors.surfaceDark` (dark) — no tinted backgrounds
- Remove `getBgColor` entirely from `TrackerCard`
- Border: hairline, `colors.border` / `colors.borderDark`
- Shadow: existing light shadow in light mode only (no change)

### Typography

- Tracker name: 20pt bold (no change)
- Category: 12pt uppercase secondary (no change)
- Status text: 15pt semibold, colored with `trafficColor`
- Last taken: 13pt secondary (reduced from default body)
- Log button: full-width, `variant="primary"` always — color conveys enough status via the ring; button variant distinction is removed

### Ring Implementation

Add `react-native-svg` via `expo install react-native-svg` (not yet in `package.json`). Draw two `Circle` elements as arcs using `strokeDasharray` / `strokeDashoffset` on a rotated SVG. Extract into `components/ui/CooldownRing.tsx`.

---

## 2. Navigation & Icons

### Large Titles

Add `headerLargeTitle: true` to all three tab screen `screenOptions` in `app/(tabs)/_layout.tsx`. This requires the FlatList / SectionList / ScrollView in each tab to be the **direct child of the screen** (not wrapped in a `View`) — see expo-router-large-title-fix skill if clipping issues arise.

### Icon Replacement

`expo-symbols` is already installed and provides **native SF Symbols** on iOS — the exact icons Apple uses. Replace `FontAwesome` with `SymbolView` from `expo-symbols` for all tab icons and header buttons.

| Location | Old (FontAwesome) | New (SF Symbol name) |
|---|---|---|
| Trackers tab | `repeat` | `timer` |
| History tab | `clock-o` | `clock` |
| Settings tab | `cog` | `gearshape` |
| Add button (header) | `plus` | `plus.circle` |
| Archive button | `pause` | `archivebox` |
| Unarchive button | `play` | `arrow.uturn.up` |
| Edit button | `pencil` | `pencil` |
| Delete button | `trash` | `trash` |
| Back-to-active chevron | `chevron-left` | `chevron.left` |
| Archive footer icon | `archive` | `archivebox` |

Tab bar icons use `SymbolView` with `tintColor`. Header buttons use `SymbolView` with `size` prop. The `SymbolView` component renders as native UIImage on iOS, so rendering is pixel-perfect and respects Dynamic Type weight.

---

## 3. History Screen

### Bar Chart (DotTimeline → BarTimeline)

- Rename `DotTimeline` → `BarTimeline`
- Increase max bar height from 40pt to 60pt
- Add `borderRadius: 4` to bars (rounded tops)
- Apply a linear opacity gradient to the accent fill: `opacity: 0.4 + 0.6 * (count / maxCount)` (no change in logic, but tighten the range for more contrast)
- Show a subtle `colors.accent` at 10% opacity as the bar track (empty day placeholder)

### Section Headers

- Increase `paddingVertical` from 8 to 10
- Add `paddingTop: 12` to feel more like Apple's grouped section headers

### Entry Rows (EntryLogItem)

Add a leading 8pt colored dot (accent color) before the tracker name — matches Apple's Reminders list item style.

---

## 4. Color System

No new colors added. Removals:

- `redBg`, `yellowBg`, `greenBg`, `redBgDark`, `yellowBgDark`, `greenBgDark` — delete from `colors` once all usages removed

These six keys are used only by `getBgColor` in `TrackerCard`, which is deleted as part of the card redesign.

---

## 5. Files to Create

- `components/ui/CooldownRing.tsx` — the SVG arc ring component

## 6. Files to Modify

- `components/TrackerCard.tsx` — new layout, ring instead of dot + tinted bg
- `components/ui/Card.tsx` — no functional change needed
- `components/ui/Button.tsx` — remove `secondary` variant usage from TrackerCard (Button itself stays)
- `app/(tabs)/_layout.tsx` — Ionicons, `headerLargeTitle`
- `app/(tabs)/index.tsx` — remove `getBgColor` dependency; ensure FlatList is direct screen child for large title
- `app/(tabs)/history.tsx` — rename/update `DotTimeline`; ensure SectionList is direct screen child
- `app/(tabs)/tracker/[id].tsx` — Ionicons for header buttons
- `lib/constants.ts` — remove unused bg color keys after migration

## 7. Out of Scope

- Settings screen (already follows Apple grouped-list patterns well)
- Add tracker screen (`tracker/add.tsx`)
- Data / DB changes
- Any new features

---

## Success Criteria

1. TrackerCard shows a circular arc ring; card background is always neutral
2. All FontAwesome icons replaced with Ionicons equivalents
3. Large titles visible and collapsing correctly on scroll for all three tabs
4. History bar chart has rounded bars and empty-day placeholders
5. No `redBg` / `yellowBg` / `greenBg` tinted backgrounds remain anywhere
6. Dark mode tested and working
