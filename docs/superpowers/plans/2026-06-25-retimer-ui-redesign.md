# ReTimer UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign ReTimer's UI to feel like a high-quality Apple app — circular progress arcs replacing color-flooded cards, native SF Symbols, and large-title navigation.

**Architecture:** The `CooldownRing` SVG component becomes the primary status signal; card background tinting is removed entirely. SF Symbols replace FontAwesome across all screens. Large titles are added to the three main tabs.

**Tech Stack:** React Native 0.83, Expo 55, expo-symbols (SF Symbols), react-native-svg (new dependency), expo-router, TypeScript.

## Global Constraints

- iOS only — SF Symbols (`expo-symbols`) and `headerLargeTitle` are iOS-specific; no fallback needed
- All user-facing strings must remain i18n keys; never hardcode display text
- Maintain dark mode support in every change — always check `isDark` and use `colors.*` tokens
- Touch targets minimum 44×44pt on all interactive elements
- Never remove or change DB queries, hooks, or business logic — visual layer only

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| **Create** | `components/ui/CooldownRing.tsx` | SVG arc ring showing cooldown progress |
| **Modify** | `components/TrackerCard.tsx` | New layout: ring replaces dot + tinted bg |
| **Modify** | `components/EntryLogItem.tsx` | Add leading accent dot before tracker name |
| **Modify** | `app/(tabs)/_layout.tsx` | SF Symbol tab icons |
| **Modify** | `app/(tabs)/index.tsx` | SF Symbol add/archive buttons, `headerLargeTitle` |
| **Modify** | `app/(tabs)/history.tsx` | SF Symbol import removed, BarTimeline update, `headerLargeTitle` |
| **Modify** | `app/(tabs)/settings.tsx` | `headerLargeTitle` |
| **Modify** | `app/(tabs)/tracker/[id].tsx` | SF Symbols for header edit/delete/archive |
| **Modify** | `lib/constants.ts` | Remove 6 unused tinted-background color keys |

---

## Task 1: Install react-native-svg and create CooldownRing

**Files:**
- Run: `npx expo install react-native-svg`
- Create: `components/ui/CooldownRing.tsx`

**Interfaces:**
- Produces: `CooldownRing` component with props:
  ```ts
  interface CooldownRingProps {
    progress: number;    // 0–1, clamped internally
    color: string;       // stroke color (traffic light color)
    isOverdue?: boolean; // shows "!" badge when true
    size?: number;       // default 52
    strokeWidth?: number; // default 5
  }
  ```

- [ ] **Step 1: Install the package**

```bash
npx expo install react-native-svg
```

Expected: package added to `node_modules` and `package.json` updated with `"react-native-svg"` in dependencies.

- [ ] **Step 2: Create `components/ui/CooldownRing.tsx`**

```tsx
import Svg, { Circle } from "react-native-svg";
import { View, StyleSheet, useColorScheme } from "react-native";
import { ThemedText } from "@/components/Themed";

interface CooldownRingProps {
  progress: number;
  color: string;
  isOverdue?: boolean;
  size?: number;
  strokeWidth?: number;
}

export function CooldownRing({
  progress,
  color,
  isOverdue = false,
  size = 52,
  strokeWidth = 5,
}: CooldownRingProps) {
  const isDark = useColorScheme() === "dark";
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const trackColor = isDark
    ? "rgba(255,255,255,0.12)"
    : "rgba(0,0,0,0.08)";

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {isOverdue && (
        <View style={styles.badge}>
          <ThemedText style={[styles.badgeText, { color }]}>!</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 14,
  },
});
```

- [ ] **Step 3: Verify the component can be imported**

Start the dev server and confirm no TypeScript errors:
```bash
npx tsc --noEmit
```
Expected: no errors about missing modules.

- [ ] **Step 4: Commit**

```bash
git add components/ui/CooldownRing.tsx package.json package-lock.json
git commit -m "feat: add CooldownRing SVG arc component and react-native-svg"
```

---

## Task 2: Redesign TrackerCard

**Files:**
- Modify: `components/TrackerCard.tsx`

**Interfaces:**
- Consumes: `CooldownRing` from `@/components/ui/CooldownRing`
- Consumes: `useCooldownStatus` which returns `{ status, remainingSeconds, elapsedSeconds, overdueSeconds }`
- Props interface is unchanged (no API change)

- [ ] **Step 1: Replace `components/TrackerCard.tsx` with the new implementation**

Complete replacement — do not preserve the old file's content:

```tsx
import { View, StyleSheet, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CooldownRing } from "@/components/ui/CooldownRing";
import { ThemedText } from "@/components/Themed";
import { useCooldownStatus, CooldownStatus } from "@/hooks/useCooldownStatus";
import { colors } from "@/lib/constants";
import { formatCountdown } from "@/lib/duration";

const BUILT_IN_CATS = ["health", "vehicle", "home", "personal", "other"];

interface TrackerCardProps {
  tracker: {
    id: number;
    name: string;
    cooldownMin: number;
    cooldownMax: number;
    notes: string | null;
    notifyEnabled: number;
    category: string | null;
  };
  lastEntryAt: string | null;
  onLogEntry: (trackerId: number) => void;
  onPress: (trackerId: number) => void;
}

function formatLastTaken(
  dateStr: string,
  t: (key: string, opts?: Record<string, string>) => string
): string {
  const date = new Date(dateStr);
  const timeStr = format(date, "h:mm a");
  if (isToday(date)) return `${t("history.today")} ${timeStr}`;
  if (isYesterday(date)) return `${t("history.yesterday")} ${timeStr}`;
  const daysDiff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (daysDiff >= 7) return format(date, "MMM d, yyyy");
  return format(date, "MMM d h:mm a");
}

function getTrafficColor(status: CooldownStatus): string {
  switch (status) {
    case "red":
    case "overdue":
      return colors.red;
    case "yellow":
      return colors.yellow;
    case "green":
      return colors.green;
  }
}

export function TrackerCard({
  tracker,
  lastEntryAt,
  onLogEntry,
  onPress,
}: TrackerCardProps) {
  const { t } = useTranslation();
  const { status, remainingSeconds, overdueSeconds, elapsedSeconds } =
    useCooldownStatus(lastEntryAt, tracker.cooldownMin, tracker.cooldownMax);

  const trafficColor = getTrafficColor(status);

  const maxCooldownSeconds = tracker.cooldownMax * 60;
  const ringProgress =
    maxCooldownSeconds > 0
      ? elapsedSeconds / maxCooldownSeconds
      : lastEntryAt
        ? 1
        : 0;

  const usesDueIn = remainingSeconds > 86400;

  let statusText: string;
  if (status === "overdue") {
    statusText = t("status.overdue", { time: formatCountdown(overdueSeconds) });
  } else if (status === "green") {
    statusText = t("status.safe");
  } else if (status === "red") {
    statusText = usesDueIn
      ? t("status.dueIn", { time: formatCountdown(remainingSeconds) })
      : t("status.wait", { time: formatCountdown(remainingSeconds) });
  } else {
    statusText = t("status.approachingTime", {
      time: formatCountdown(remainingSeconds),
    });
  }

  const lastTakenText = lastEntryAt
    ? t("entry.lastLogged", { time: formatLastTaken(lastEntryAt, t) })
    : t("entry.neverLogged");

  return (
    <Card
      onPress={() => onPress(tracker.id)}
      style={styles.card}
      accessibilityLabel={`${tracker.name}, ${statusText}`}
      accessibilityHint={t("entry.tapToViewDetails")}
    >
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <ThemedText style={styles.name} accessibilityRole="header">
            {tracker.name}
          </ThemedText>
          {tracker.category && tracker.category !== "other" ? (
            <ThemedText variant="secondary" style={styles.category}>
              {BUILT_IN_CATS.includes(tracker.category)
                ? t(`categories.${tracker.category}`)
                : tracker.category}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.statusText, { color: trafficColor }]}>
            {statusText}
          </ThemedText>
          <ThemedText variant="secondary" style={styles.lastTaken}>
            {lastTakenText}
          </ThemedText>
        </View>
        <CooldownRing
          progress={ringProgress}
          color={trafficColor}
          isOverdue={status === "overdue"}
        />
      </View>

      <Button
        title={t("entry.log")}
        variant="primary"
        onPress={() => onLogEntry(tracker.id)}
        style={styles.logButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleArea: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  category: {
    marginTop: 2,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  lastTaken: {
    marginTop: 3,
    fontSize: 13,
  },
  logButton: {
    marginTop: 16,
  },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Visual check in simulator**

```bash
npx expo start --ios
```
Open the dashboard. Confirm:
- Cards have white/dark backgrounds (no red/green/yellow floods)
- Each card shows a circular arc ring on the right, colored to status
- Overdue trackers show a `!` badge on the ring
- Log button is always the same blue

- [ ] **Step 4: Commit**

```bash
git add components/TrackerCard.tsx
git commit -m "feat: redesign TrackerCard with circular progress arc"
```

---

## Task 3: SF Symbol tab icons and large titles

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/history.tsx`
- Modify: `app/(tabs)/settings.tsx`

**Interfaces:**
- Consumes: `SymbolView` from `expo-symbols` (already installed)

- [ ] **Step 1: Update `app/(tabs)/_layout.tsx`**

Replace the entire file:

```tsx
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";
import { SymbolView } from "expo-symbols";
import { colors } from "../../lib/constants";

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? colors.backgroundDark : colors.background,
          borderTopColor: isDark ? colors.borderDark : colors.border,
        },
        headerStyle: {
          backgroundColor: isDark ? colors.backgroundDark : colors.background,
        },
        headerTintColor: isDark ? colors.textDark : colors.text,
        headerLargeTitleStyle: {
          color: isDark ? colors.textDark : colors.text,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.trackers"),
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "timer.fill" : "timer"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "clock.fill" : "clock"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? "gearshape.fill" : "gearshape"}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="tracker/add" options={{ href: null }} />
      <Tabs.Screen name="tracker/[id]" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Add `headerLargeTitle` and SF Symbol add button in `app/(tabs)/index.tsx`**

At the top of the file, replace the FontAwesome import with SymbolView:
```tsx
// Remove:
import FontAwesome from "@expo/vector-icons/FontAwesome";
// Add:
import { SymbolView } from "expo-symbols";
```

Update the `Stack.Screen` options block (lines ~203–222) to add `headerLargeTitle` and replace the add button icon:
```tsx
<Stack.Screen
  options={{
    title: t("dashboard.title"),
    headerLargeTitle: true,
    headerRight: () => (
      <Pressable
        onPress={navigateToAdd}
        hitSlop={8}
        accessibilityLabel={t("dashboard.addTracker")}
        accessibilityRole="button"
      >
        <SymbolView
          name="plus.circle"
          size={26}
          tintColor={colors.accent}
          style={styles.headerButton}
        />
      </Pressable>
    ),
  }}
/>
```

Update the back-to-active chevron in the archived filter bar (line ~239):
```tsx
<Pressable
  onPress={() => setShowArchived(false)}
  style={styles.backToActive}
  accessibilityRole="button"
>
  <SymbolView name="chevron.left" size={14} tintColor={colors.accent} />
  <ThemedText style={styles.backToActiveText}>
    {t("dashboard.title")}
  </ThemedText>
</Pressable>
```

Update the archive footer icon (line ~359):
```tsx
<SymbolView
  name="archivebox"
  size={14}
  tintColor={colors.textSecondary}
  style={{ marginRight: 6 }}
/>
```

- [ ] **Step 3: Add `headerLargeTitle` to `app/(tabs)/history.tsx`**

In `history.tsx`, update the `Stack.Screen` call (line 299):
```tsx
<Stack.Screen options={{ title: t("history.title"), headerLargeTitle: true }} />
```

No icon changes needed in history.tsx (it has no header buttons).

- [ ] **Step 4: Add `headerLargeTitle` to `app/(tabs)/settings.tsx`**

In `settings.tsx`, update the `Stack.Screen` call (line 86):
```tsx
<Stack.Screen options={{ title: t("settings.title"), headerLargeTitle: true }} />
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Visual check in simulator**

Open all three tabs. Confirm:
- Tab icons are SF Symbols (native Apple look), not FontAwesome
- Focused tab shows filled variant (e.g. `timer.fill`)
- Trackers, History, and Settings screens show large titles that collapse on scroll
- Dashboard add button shows `plus.circle` SF Symbol

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/index.tsx app/(tabs)/history.tsx app/(tabs)/settings.tsx
git commit -m "feat: replace FontAwesome with SF Symbols and add large titles"
```

---

## Task 4: SF Symbols in tracker detail header

**Files:**
- Modify: `app/(tabs)/tracker/[id].tsx`

- [ ] **Step 1: Replace FontAwesome import with SymbolView in `tracker/[id].tsx`**

At the top of the file:
```tsx
// Remove:
import FontAwesome from "@expo/vector-icons/FontAwesome";
// Add:
import { SymbolView } from "expo-symbols";
```

- [ ] **Step 2: Replace the three header buttons in the `headerRight` option**

Find the `headerRight` block (around lines 203–244) and replace:

```tsx
headerRight: () =>
  !editing ? (
    <View style={styles.headerRight}>
      <Pressable
        onPress={handleArchiveToggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          tracker.isArchived === 1
            ? t("tracker.unarchive")
            : t("tracker.archive")
        }
      >
        <SymbolView
          name={tracker.isArchived === 1 ? "arrow.uturn.up" : "archivebox"}
          size={20}
          tintColor={colors.accent}
          style={styles.headerIcon}
        />
      </Pressable>
      <Pressable
        onPress={startEditing}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("common.edit")}
      >
        <SymbolView
          name="pencil"
          size={20}
          tintColor={colors.accent}
          style={styles.headerIcon}
        />
      </Pressable>
      <Pressable
        onPress={handleDelete}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("common.delete")}
      >
        <SymbolView
          name="trash"
          size={20}
          tintColor={colors.destructive}
          style={styles.headerIcon}
        />
      </Pressable>
    </View>
  ) : null,
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Visual check**

Tap a tracker card to open the detail screen. Confirm:
- Header right shows three SF Symbol icons (archivebox, pencil, trash)
- Colors match: accent for archive/edit, destructive red for trash

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/tracker/[id].tsx"
git commit -m "feat: replace FontAwesome header icons with SF Symbols in tracker detail"
```

---

## Task 5: History screen BarTimeline + EntryLogItem dot

**Files:**
- Modify: `app/(tabs)/history.tsx`
- Modify: `components/EntryLogItem.tsx`

- [ ] **Step 1: Rename and upgrade DotTimeline → BarTimeline in `history.tsx`**

Replace the `DotTimeline` function (lines 87–169) with:

```tsx
function BarTimeline({
  logs,
  isDark,
  t,
}: {
  logs: EntryLogRow[];
  isDark: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const today = startOfDay(new Date());
  const dayWidth = (SCREEN_WIDTH - 48) / TIMELINE_DAYS;

  const dayCounts = new Map<string, number>();
  for (const log of logs) {
    const key = format(new Date(log.loggedAt), "yyyy-MM-dd");
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const maxCount = Math.max(1, ...Array.from(dayCounts.values()));

  const days: { key: string; count: number }[] = [];
  for (let i = TIMELINE_DAYS - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    days.push({ key, count: dayCounts.get(key) ?? 0 });
  }

  const trackColor = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(0,0,0,0.06)";

  return (
    <View
      style={[
        timelineStyles.container,
        { backgroundColor: isDark ? colors.surfaceDark : colors.surface },
      ]}
    >
      <ThemedText style={timelineStyles.title}>
        {t("history.frequency")}
      </ThemedText>
      <View style={timelineStyles.grid}>
        {days.map((day) => {
          const barHeight =
            day.count > 0 ? Math.max(8, (day.count / maxCount) * 60) : 0;
          const barOpacity =
            day.count > 0 ? 0.4 + 0.6 * (day.count / maxCount) : 1;
          return (
            <View
              key={day.key}
              style={[timelineStyles.dayColumn, { width: dayWidth }]}
            >
              <View style={timelineStyles.barArea}>
                <View
                  style={[timelineStyles.track, { backgroundColor: trackColor }]}
                />
                {day.count > 0 && (
                  <View
                    style={[
                      timelineStyles.bar,
                      {
                        height: barHeight,
                        backgroundColor: colors.accent,
                        opacity: barOpacity,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={[timelineStyles.labelRow, { width: SCREEN_WIDTH - 48 }]}>
        <ThemedText variant="secondary" style={timelineStyles.dateLabel}>
          {format(subDays(today, TIMELINE_DAYS - 1), "MMM d")}
        </ThemedText>
        <ThemedText variant="secondary" style={timelineStyles.dateLabel}>
          {format(today, "MMM d")}
        </ThemedText>
      </View>
      <ThemedText variant="secondary" style={timelineStyles.summary}>
        {t("history.entries", { count: logs.length })}
      </ThemedText>
    </View>
  );
}
```

Update the `ListHeaderComponent` reference (around line 419):
```tsx
ListHeaderComponent={
  showTimeline ? (
    <BarTimeline logs={logs} isDark={isDark} t={t} />
  ) : null
}
```

Replace `timelineStyles` (lines 513–558) with:

```tsx
const timelineStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 60,
  },
  dayColumn: {
    alignItems: "center",
  },
  barArea: {
    height: 60,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    position: "relative",
  },
  track: {
    position: "absolute",
    bottom: 0,
    width: "60%",
    height: 3,
    borderRadius: 3,
  },
  bar: {
    width: "60%",
    borderRadius: 4,
    minWidth: 3,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  dateLabel: {
    fontSize: 11,
  },
  summary: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
});
```

Also update the `renderSectionHeader` `paddingVertical` (line ~432):
```tsx
style={[
  styles.sectionHeader,
  {
    backgroundColor: isDark ? colors.backgroundDark : colors.background,
  },
]}
```
And in `styles.sectionHeader` (line ~486):
```tsx
sectionHeader: {
  paddingHorizontal: 16,
  paddingVertical: 10,
  paddingTop: 12,
},
```

- [ ] **Step 2: Add leading accent dot to `components/EntryLogItem.tsx`**

Replace the `return` block and add the `dot` style:

```tsx
return (
  <Pressable
    onLongPress={handleLongPress}
    style={({ pressed }) => [
      styles.row,
      {
        backgroundColor: isDark ? colors.surfaceDark : colors.surface,
        borderBottomColor: isDark ? colors.borderDark : colors.border,
      },
      pressed && styles.pressed,
    ]}
    accessibilityLabel={`${trackerName}, ${formatTimestamp(loggedAt, t("history.yesterday"))}`}
    accessibilityHint={t("history.deleteConfirm")}
    accessibilityRole="button"
  >
    <View style={styles.dot} />
    <ThemedText style={styles.name} numberOfLines={1}>
      {trackerName}
    </ThemedText>
    <ThemedText variant="secondary" style={styles.time}>
      {formatTimestamp(loggedAt, t("history.yesterday"))}
    </ThemedText>
  </Pressable>
);
```

Add to `styles`:
```tsx
dot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.accent,
  marginRight: 10,
  flexShrink: 0,
},
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Visual check**

Go to the History tab. Confirm:
- Entry rows each have a small blue dot on the left
- When filtering to a specific tracker/category, the frequency chart shows taller rounded bars with faint 3px track dots for empty days
- Section headers have slightly more vertical breathing room

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/history.tsx" components/EntryLogItem.tsx
git commit -m "feat: upgrade history bar chart and add leading dot to entry rows"
```

---

## Task 6: Remove unused tinted-background color constants

**Files:**
- Modify: `lib/constants.ts`

**Context:** After Tasks 2 and 3, these keys are no longer referenced: `redBg`, `yellowBg`, `greenBg`, `redBgDark`, `yellowBgDark`, `greenBgDark`. They were only used by the deleted `getBgColor` function in `TrackerCard`.

- [ ] **Step 1: Confirm no remaining usages**

```bash
grep -r "redBg\|yellowBg\|greenBg\|redBgDark\|yellowBgDark\|greenBgDark" \
  /Users/quxia/Documents/2026/ReTimer/app \
  /Users/quxia/Documents/2026/ReTimer/components \
  /Users/quxia/Documents/2026/ReTimer/hooks \
  /Users/quxia/Documents/2026/ReTimer/lib
```

Expected: no output (zero matches).

- [ ] **Step 2: Remove the six keys from `lib/constants.ts`**

Replace the `colors` export with:

```ts
export const colors = {
  primary: "#1a1a2e",
  accent: "#2196F3",
  background: "#f8f9fa",
  backgroundDark: "#1c1c1e",
  surface: "#ffffff",
  surfaceDark: "#2c2c2e",
  text: "#1a1a2e",
  textDark: "#f5f5f5",
  textSecondary: "#6c757d",
  border: "#dee2e6",
  borderDark: "#3a3a3c",
  destructive: "#FF3B30",

  // Traffic light
  red: "#FF3B30",
  yellow: "#FF9500",
  green: "#34C759",
};
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors (the removed keys should have no remaining references).

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts
git commit -m "chore: remove unused tinted-background color tokens"
```

---

## Self-Review Checklist

- [x] **CooldownRing** — Task 1 creates it; Task 2 consumes it ✓
- [x] **Card backgrounds always neutral** — Task 2 removes `getBgColor` and `bgColor` from TrackerCard ✓
- [x] **SF Symbols tab icons** — Task 3 `_layout.tsx` ✓
- [x] **SF Symbols header buttons (dashboard)** — Task 3 `index.tsx` ✓
- [x] **SF Symbols header buttons (detail)** — Task 4 `tracker/[id].tsx` ✓
- [x] **Large titles on all three tabs** — Task 3 (index, history, settings) ✓
- [x] **BarTimeline — taller + rounded + track placeholders** — Task 5 `history.tsx` ✓
- [x] **Leading dot on entry rows** — Task 5 `EntryLogItem.tsx` ✓
- [x] **Unused bg color constants removed** — Task 6 `constants.ts` ✓
- [x] **Settings screen** — out of scope, no task needed ✓
- [x] **Add tracker screen** — out of scope, no task needed ✓
- [x] **No placeholder steps** — all steps contain actual code ✓
- [x] **Type consistency** — `CooldownRing` props defined in Task 1, consumed in Task 2 with matching types ✓
