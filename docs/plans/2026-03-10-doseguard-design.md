# DoseGuard — Design Document

## Overview

DoseGuard is a medication cooldown timer app. Users log when they take a medication, and the app shows a traffic-light indicator (red/yellow/green) to prevent retaking too soon.

## Tech Stack

- Expo managed workflow (TypeScript)
- expo-router (file-based routing, tab layout)
- expo-sqlite (local database)
- expo-notifications (local push)
- expo-haptics (feedback on actions)
- i18n ready (en + zh)

## Navigation

### Tab Bar (3 tabs)

| Tab | Screen | Purpose |
|-----|--------|---------|
| Medications | Main dashboard | Traffic-light cards, "Log Dose", "Add Medication" |
| History | Dose log | Chronological list of all doses, filterable by medication |
| Settings | Preferences | Notification toggles, manage presets, app info |

### Stack Screens (pushed from tabs)

- **Add/Edit Medication** — name, cooldown min/max, notes, notification toggle
- **Medication Detail** — full history for a single medication, edit/delete

## Data Model

### medications

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment |
| name | TEXT | e.g., "Ibuprofen" |
| cooldown_min | INTEGER | Minimum wait in minutes |
| cooldown_max | INTEGER | Maximum wait in minutes |
| notes | TEXT (nullable) | e.g., "Take with food" |
| notify_enabled | INTEGER | 0 or 1 |
| is_preset | INTEGER | 0 or 1 |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### dose_logs

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment |
| medication_id | INTEGER FK | References medications.id |
| taken_at | TEXT | ISO timestamp |
| created_at | TEXT | ISO timestamp |

### settings

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PRIMARY KEY | Setting key |
| value | TEXT | Setting value |

## Traffic Light Logic

Derived from `now - last_taken_at`:

- **Red**: elapsed < cooldown_min
- **Yellow**: cooldown_min <= elapsed < cooldown_max
- **Green**: elapsed >= cooldown_max (or no dose logged)

## Medication Dashboard

- Each medication is a card with: name, notes, traffic light circle, status text, last taken time, "Log Dose" button
- Log Dose is prominent when green, dimmed when red/yellow
- Tapping Log Dose while red/yellow shows confirmation alert
- Empty state with onboarding message and "Add Your First Medication" button

## Preset Medications

| Medication | Min | Max | Notes |
|-----------|-----|-----|-------|
| Ibuprofen (Advil) | 4h | 6h | Take with food |
| Acetaminophen (Tylenol) | 4h | 6h | Max 4g/day |
| Aspirin | 4h | 6h | Take with food |
| Naproxen (Aleve) | 8h | 12h | Take with food |
| Diphenhydramine (Benadryl) | 4h | 6h | May cause drowsiness |
| Cetirizine (Zyrtec) | 24h | 24h | Once daily |
| Loratadine (Claritin) | 24h | 24h | Once daily |
| Famotidine (Pepcid) | 12h | 12h | — |

Users can pick from presets (auto-fills fields) or create custom entries. Presets are editable.

## Notifications

- Local scheduled notifications via expo-notifications
- Scheduled when a dose is logged, fires at cooldown_max ("Ibuprofen is safe to take again")
- Per-medication toggle + global toggle in Settings
- New dose cancels previous pending notification and schedules a new one

## Background Behavior

- No background timers — traffic light calculated on-the-fly from `now` vs `last_taken_at`
- 1-second interval timer refreshes countdown while app is in foreground
