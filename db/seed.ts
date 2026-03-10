import { db } from "./client";
import { medications } from "./schema";

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
