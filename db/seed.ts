import { db } from "./client";
import { trackers } from "./schema";

const PRESETS = [
  { name: "Ibuprofen (Advil)", cooldownMin: 240, cooldownMax: 360, notes: "Take with food", category: "health" },
  { name: "Acetaminophen (Tylenol)", cooldownMin: 240, cooldownMax: 360, notes: "Max 4g/day", category: "health" },
  { name: "Aspirin", cooldownMin: 240, cooldownMax: 360, notes: "Take with food", category: "health" },
  { name: "Naproxen (Aleve)", cooldownMin: 480, cooldownMax: 720, notes: "Take with food", category: "health" },
  { name: "Diphenhydramine (Benadryl)", cooldownMin: 240, cooldownMax: 360, notes: "May cause drowsiness", category: "health" },
  { name: "Cetirizine (Zyrtec)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily", category: "health" },
  { name: "Loratadine (Claritin)", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily", category: "health" },
  { name: "Famotidine (Pepcid)", cooldownMin: 720, cooldownMax: 720, notes: "", category: "health" },
  { name: "Oil Change", cooldownMin: 129600, cooldownMax: 259200, notes: "Check oil level monthly", category: "vehicle" },
  { name: "Tire Rotation", cooldownMin: 259200, cooldownMax: 388800, notes: "Every 5,000-7,500 miles", category: "vehicle" },
  { name: "Air Filter (Home)", cooldownMin: 129600, cooldownMax: 259200, notes: "Check monthly", category: "home" },
  { name: "Water Filter", cooldownMin: 259200, cooldownMax: 388800, notes: "Replace cartridge", category: "home" },
  { name: "HVAC Service", cooldownMin: 259200, cooldownMax: 525600, notes: "Annual recommended", category: "home" },
  { name: "Haircut", cooldownMin: 20160, cooldownMax: 60480, notes: "", category: "personal" },
  { name: "Dental Checkup", cooldownMin: 259200, cooldownMax: 525600, notes: "", category: "health" },
  { name: "Eye Exam", cooldownMin: 525600, cooldownMax: 1051200, notes: "", category: "health" },
];

export async function seedPresets() {
  const existing = await db.select().from(trackers);
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  for (const p of PRESETS) {
    await db.insert(trackers).values({
      ...p,
      notifyEnabled: 1,
      isPreset: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
}
