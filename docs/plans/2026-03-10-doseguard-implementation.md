# DoseGuard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a medication cooldown timer app that logs doses and shows traffic-light status (red/yellow/green) to prevent retaking medications too soon.

**Architecture:** Expo managed workflow with expo-router (file-based tabs), expo-sqlite + drizzle-orm for local storage, expo-notifications for cooldown alerts, i18next for i18n, Zustand for UI state. Follows the same patterns as the `stamped` app.

**Tech Stack:** Expo SDK ~54, React Native, TypeScript, expo-router, expo-sqlite, drizzle-orm, i18next, Zustand, expo-notifications, expo-haptics, date-fns

---

### Task 1: Scaffold Expo Project

**Files:**
- Create: `DoseGuard/` (Expo project root)

**Step 1: Create the Expo project**

```bash
cd /Users/quxia/Documents/2026
npx create-expo-app DoseGuard --template tabs
```

**Step 2: Install dependencies**

```bash
cd /Users/quxia/Documents/2026/DoseGuard
npx expo install expo-sqlite expo-notifications expo-haptics expo-localization expo-font @expo/vector-icons @react-native-community/datetimepicker react-native-safe-area-context react-native-reanimated date-fns
npm install drizzle-orm i18next react-i18next zustand
npm install -D drizzle-kit
```

**Step 3: Configure app.json**

Set name to "DoseGuard", slug "doseguard", scheme "doseguard", bundleIdentifier "com.doseguard.app", userInterfaceStyle "automatic", add plugins for expo-router, expo-sqlite, expo-notifications, @react-native-community/datetimepicker, expo-localization. Set owner to "momodream". Add ITSAppUsesNonExemptEncryption: false.

**Step 4: Clean up template files**

Remove all template screens, components, and assets that came with the tabs template. Keep only the bare structure.

**Step 5: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold DoseGuard Expo project"
```

---

### Task 2: Database Schema & Migrations

**Files:**
- Create: `db/schema.ts`
- Create: `db/client.ts`
- Create: `drizzle.config.ts`

**Step 1: Create database client**

```typescript
// db/client.ts
import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

const expo = openDatabaseSync("doseguard.db", { enableChangeListener: true });
export const db = drizzle(expo, { schema });
```

**Step 2: Create schema**

```typescript
// db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const medications = sqliteTable("medications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cooldownMin: integer("cooldown_min").notNull(), // minutes
  cooldownMax: integer("cooldown_max").notNull(), // minutes
  notes: text("notes"),
  notifyEnabled: integer("notify_enabled").notNull().default(1),
  isPreset: integer("is_preset").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const doseLogs = sqliteTable("dose_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  medicationId: integer("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  takenAt: text("taken_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
```

**Step 3: Create drizzle config**

```typescript
// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
```

**Step 4: Generate initial migration**

```bash
npx drizzle-kit generate
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add database schema and migrations"
```

---

### Task 3: Database Hooks & Seed Data

**Files:**
- Create: `hooks/useDatabase.ts`
- Create: `db/seed.ts`
- Create: `db/queries/medications.ts`
- Create: `db/queries/doseLogs.ts`

**Step 1: Create useDatabase hook**

```typescript
// hooks/useDatabase.ts
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useEffect, useState } from "react";
import { db } from "../db/client";
import migrations from "../drizzle/migrations";
import { seedPresets } from "../db/seed";

export function useDatabase() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (success) {
      seedPresets().then(() => setSeeded(true));
    }
  }, [success]);

  return { isReady: success && seeded, error };
}
```

**Step 2: Create seed data with presets**

```typescript
// db/seed.ts
import { db } from "./client";
import { medications } from "./schema";
import { eq } from "drizzle-orm";

const PRESETS = [
  { name: "Ibuprofen (Advil)", cooldownMin: 240, cooldownMax: 360, notes: "Take with food" },
  { name: "Acetaminophen (Tylenol)", cooldownMin: 240, cooldownMax: 360, notes: "Max 4g/day" },
  { name: "Aspirin", cooldownMin: 240, cooldownMax: 360, notes: "Take with food" },
  { name: "Naproxen (Aleve)", cooldownMin: 480, cooldownMax: 720, notes: "Take with food" },
  { name: "Diphenhydramine (Benadryl)", cooldownMin: 240, cooldownMax: 360, notes: "May cause drowsiness" },
  { name: "Cetirizine (Zyrtec)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily" },
  { name: "Loratadine (Claritin)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily" },
  { name: "Famotidine (Pepcid)", cooldownMin: 720, cooldownMax: 720, notes: "" },
];

export async function seedPresets() {
  const existing = await db.select().from(medications);
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  for (const p of PRESETS) {
    await db.insert(medications).values({
      ...p,
      notifyEnabled: 1,
      isPreset: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
}
```

**Step 3: Create medication queries**

```typescript
// db/queries/medications.ts
import { db } from "../client";
import { medications } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllMedications() {
  return db.select().from(medications);
}

export async function getMedication(id: number) {
  const rows = await db.select().from(medications).where(eq(medications.id, id));
  return rows[0] ?? null;
}

export async function insertMedication(data: {
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes?: string;
  notifyEnabled?: number;
  isPreset?: number;
}) {
  const now = new Date().toISOString();
  return db.insert(medications).values({
    ...data,
    notifyEnabled: data.notifyEnabled ?? 1,
    isPreset: data.isPreset ?? 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateMedication(
  id: number,
  data: Partial<{ name: string; cooldownMin: number; cooldownMax: number; notes: string; notifyEnabled: number }>
) {
  return db
    .update(medications)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(medications.id, id));
}

export async function deleteMedication(id: number) {
  return db.delete(medications).where(eq(medications.id, id));
}
```

**Step 4: Create dose log queries**

```typescript
// db/queries/doseLogs.ts
import { db } from "../client";
import { doseLogs, medications } from "../schema";
import { eq, desc, and, gte } from "drizzle-orm";

export async function logDose(medicationId: number) {
  const now = new Date().toISOString();
  return db.insert(doseLogs).values({
    medicationId,
    takenAt: now,
    createdAt: now,
  });
}

export async function getLastDose(medicationId: number) {
  const rows = await db
    .select()
    .from(doseLogs)
    .where(eq(doseLogs.medicationId, medicationId))
    .orderBy(desc(doseLogs.takenAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDoseHistory(medicationId?: number) {
  const query = db
    .select({
      id: doseLogs.id,
      medicationId: doseLogs.medicationId,
      medicationName: medications.name,
      takenAt: doseLogs.takenAt,
    })
    .from(doseLogs)
    .innerJoin(medications, eq(doseLogs.medicationId, medications.id))
    .orderBy(desc(doseLogs.takenAt));

  if (medicationId) {
    return query.where(eq(doseLogs.medicationId, medicationId));
  }
  return query;
}

export async function deleteDoseLog(id: number) {
  return db.delete(doseLogs).where(eq(doseLogs.id, id));
}
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add database hooks, seed data, and query helpers"
```

---

### Task 4: i18n Setup

**Files:**
- Create: `lib/i18n/index.ts`
- Create: `lib/i18n/en.json`
- Create: `lib/i18n/zh.json`

**Step 1: Create i18n config**

```typescript
// lib/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./en.json";
import zh from "./zh.json";

const languageCode = Localization.getLocales()[0]?.languageCode ?? "en";
const lng = languageCode === "zh" ? "zh" : "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
```

**Step 2: Create en.json with all strings**

Keys organized by domain: `tabs`, `dashboard`, `history`, `settings`, `medication`, `dose`, `status`, `common`, `presets`, `notifications`.

**Step 3: Create zh.json with Chinese translations**

Mirror all en.json keys with Chinese translations.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add i18n setup with en/zh translations"
```

---

### Task 5: Theme, Constants & Shared UI

**Files:**
- Create: `lib/constants.ts`
- Create: `components/Themed.tsx`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`

**Step 1: Create constants with traffic light colors**

```typescript
// lib/constants.ts
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
  redBg: "#FFF0F0",
  yellowBg: "#FFF8E7",
  greenBg: "#F0FFF4",
  redBgDark: "#3A1A1A",
  yellowBgDark: "#3A2E1A",
  greenBgDark: "#1A3A1A",
};
```

**Step 2: Create Themed components**

Theme-aware View and Text wrappers using `useColorScheme()` — same pattern as stamped.

**Step 3: Create Button component**

Primary/secondary/danger variants with haptic feedback on press.

**Step 4: Create Card component**

Surface card with shadow, adapts to light/dark mode.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add theme constants and shared UI components"
```

---

### Task 6: Notification Service

**Files:**
- Create: `lib/notifications.ts`

**Step 1: Create notification service**

```typescript
// lib/notifications.ts
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleCooldownNotification(
  medicationName: string,
  cooldownMaxMinutes: number,
  medicationId: number
) {
  await cancelCooldownNotification(medicationId);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: medicationName,
      body: `${medicationName} is safe to take again.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: cooldownMaxMinutes * 60,
    },
    identifier: `cooldown-${medicationId}`,
  });
}

export async function cancelCooldownNotification(medicationId: number) {
  await Notifications.cancelScheduledNotificationAsync(`cooldown-${medicationId}`);
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add notification service for cooldown alerts"
```

---

### Task 7: Traffic Light Logic Hook

**Files:**
- Create: `hooks/useCooldownStatus.ts`

**Step 1: Create cooldown status hook**

```typescript
// hooks/useCooldownStatus.ts
import { useState, useEffect, useCallback } from "react";
import { differenceInSeconds } from "date-fns";

export type CooldownStatus = "green" | "yellow" | "red";

interface CooldownState {
  status: CooldownStatus;
  remainingSeconds: number;
  elapsedSeconds: number;
  lastTakenAt: Date | null;
}

export function useCooldownStatus(
  lastTakenAt: string | null,
  cooldownMin: number, // minutes
  cooldownMax: number  // minutes
): CooldownState {
  const calculate = useCallback((): CooldownState => {
    if (!lastTakenAt) {
      return { status: "green", remainingSeconds: 0, elapsedSeconds: 0, lastTakenAt: null };
    }

    const taken = new Date(lastTakenAt);
    const elapsed = differenceInSeconds(new Date(), taken);
    const minSeconds = cooldownMin * 60;
    const maxSeconds = cooldownMax * 60;

    let status: CooldownStatus;
    if (elapsed >= maxSeconds) {
      status = "green";
    } else if (elapsed >= minSeconds) {
      status = "yellow";
    } else {
      status = "red";
    }

    return {
      status,
      remainingSeconds: Math.max(0, maxSeconds - elapsed),
      elapsedSeconds: elapsed,
      lastTakenAt: taken,
    };
  }, [lastTakenAt, cooldownMin, cooldownMax]);

  const [state, setState] = useState(calculate);

  useEffect(() => {
    setState(calculate());
    if (!lastTakenAt) return;

    const interval = setInterval(() => {
      const newState = calculate();
      setState(newState);
      if (newState.status === "green") clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [calculate, lastTakenAt]);

  return state;
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add cooldown status hook with traffic light logic"
```

---

### Task 8: Root Layout & Tab Navigation

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`

**Step 1: Create root layout**

Initialize i18n import, database via useDatabase(), show loading state until ready. Wrap in ThemeProvider.

**Step 2: Create tab layout**

Three tabs: Medications (pill icon), History (clock icon), Settings (gear icon). Include hidden stack screens for add/edit medication and medication detail. Follow stamped pattern with `href: null` for hidden screens.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add root layout and tab navigation"
```

---

### Task 9: Medication Dashboard Screen

**Files:**
- Create: `app/(tabs)/index.tsx`
- Create: `components/MedicationCard.tsx`
- Create: `components/EmptyState.tsx`

**Step 1: Create MedicationCard component**

Card showing: medication name, notes, traffic light circle (large colored dot), status text with countdown, last taken time, and "Log Dose" button. Button is prominent when green, dimmed when red/yellow. Uses `useCooldownStatus` hook internally.

**Step 2: Create EmptyState component**

Friendly message with "Add Your First Medication" button.

**Step 3: Create dashboard screen**

FlatList of MedicationCard components. Fetches all medications + their last dose on mount and on focus. "Add" button in header that navigates to add medication screen. Pull-to-refresh.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add medication dashboard with traffic light cards"
```

---

### Task 10: Add/Edit Medication Screen

**Files:**
- Create: `app/(tabs)/medication/add.tsx`
- Create: `app/(tabs)/medication/[id].tsx`
- Create: `components/PresetPicker.tsx`

**Step 1: Create PresetPicker component**

List of preset medications to choose from. Tapping a preset fills the form fields (name, cooldownMin, cooldownMax, notes). Also has a "Custom" option at the top.

**Step 2: Create Add Medication screen**

Form with: preset picker (collapsed by default, expandable), name input, cooldown min/max pickers (hours + minutes), notes input, notification toggle. Save button inserts into DB and navigates back.

**Step 3: Create Medication Detail / Edit screen**

Shows medication info and full dose history for that medication. Edit button to modify fields. Delete button with confirmation. Uses route param `[id]`.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add medication add/edit/detail screens"
```

---

### Task 11: Dose Logging with Notifications

**Files:**
- Modify: `components/MedicationCard.tsx`

**Step 1: Implement Log Dose action**

When "Log Dose" is tapped:
1. If status is red/yellow, show Alert.alert confirmation with elapsed time info
2. On confirm (or if green), call `logDose(medicationId)`
3. If `notifyEnabled`, call `scheduleCooldownNotification()`
4. Trigger haptic feedback (Haptics.impactAsync)
5. Refresh the card state

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add dose logging with confirmation and notifications"
```

---

### Task 12: History Screen

**Files:**
- Create: `app/(tabs)/history.tsx`
- Create: `components/DoseLogItem.tsx`

**Step 1: Create DoseLogItem component**

Row showing: medication name, timestamp formatted nicely (e.g., "Today 2:30 PM", "Yesterday 8:15 PM", "Mar 5 10:00 AM"). Swipe-to-delete or long-press to delete.

**Step 2: Create History screen**

FlatList of all dose logs, sorted newest first. Filter chip bar at top to filter by medication (optional). Section headers by date. Empty state if no history.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add dose history screen with filtering"
```

---

### Task 13: Settings Screen

**Files:**
- Create: `app/(tabs)/settings.tsx`

**Step 1: Create Settings screen**

Sections:
- **Notifications**: Global notification toggle (Switch)
- **Data**: "Clear All History" button with confirmation
- **About**: App version, developer info

Uses native-feeling grouped list style (iOS Settings aesthetic).

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add settings screen"
```

---

### Task 14: Polish & Accessibility

**Files:**
- Modify: all component files

**Step 1: Add accessibility props**

Add `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` to all interactive elements. Ensure traffic light status is announced by VoiceOver (e.g., "Ibuprofen: red, wait 2 hours 15 minutes").

**Step 2: Dark mode verification**

Verify all screens render correctly in both light and dark mode. Fix any hardcoded colors.

**Step 3: Haptic feedback**

Add haptic feedback to: Log Dose, Add Medication save, Delete actions.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add accessibility, dark mode, and haptic polish"
```

---

### Task 15: Final Testing & Cleanup

**Step 1: Test on simulator**

```bash
npx expo start
```

Verify:
- Preset medications appear on first launch
- Adding custom medication works
- Log Dose updates traffic light in real-time
- Notifications fire after cooldown
- History shows all logged doses
- Settings toggles work
- Dark mode works
- i18n switches work

**Step 2: Clean up unused files**

Remove any template leftovers, unused imports.

**Step 3: Final commit**

```bash
git add -A && git commit -m "chore: final cleanup and testing"
```
