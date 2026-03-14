import { db } from "./client";
import { trackers, settings } from "./schema";
import { eq } from "drizzle-orm";
import i18n from "@/lib/i18n";

const PRESETS = [
  { i18nKey: "presets.ibuprofen", cooldownMin: 240, cooldownMax: 360, notes: "Take with food", category: "health" },
  { i18nKey: "presets.acetaminophen", cooldownMin: 240, cooldownMax: 360, notes: "Max 4g/day", category: "health" },
  { i18nKey: "presets.aspirin", cooldownMin: 240, cooldownMax: 360, notes: "Take with food", category: "health" },
  { i18nKey: "presets.naproxen", cooldownMin: 480, cooldownMax: 720, notes: "Take with food", category: "health" },
  { i18nKey: "presets.diphenhydramine", cooldownMin: 240, cooldownMax: 360, notes: "May cause drowsiness", category: "health" },
  { i18nKey: "presets.cetirizine", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily", category: "health" },
  { i18nKey: "presets.loratadine", cooldownMin: 1440, cooldownMax: 1440, notes: "Once daily", category: "health" },
  { i18nKey: "presets.famotidine", cooldownMin: 720, cooldownMax: 720, notes: "", category: "health" },
  { i18nKey: "presets.oilChange", cooldownMin: 129600, cooldownMax: 259200, notes: "Check oil level monthly", category: "vehicle" },
  { i18nKey: "presets.tireRotation", cooldownMin: 259200, cooldownMax: 388800, notes: "Every 5,000-7,500 miles", category: "vehicle" },
  { i18nKey: "presets.airFilter", cooldownMin: 129600, cooldownMax: 259200, notes: "Check monthly", category: "home" },
  { i18nKey: "presets.waterFilter", cooldownMin: 259200, cooldownMax: 388800, notes: "Replace cartridge", category: "home" },
  { i18nKey: "presets.hvacService", cooldownMin: 259200, cooldownMax: 525600, notes: "Annual recommended", category: "home" },
  { i18nKey: "presets.haircut", cooldownMin: 20160, cooldownMax: 60480, notes: "", category: "personal" },
  { i18nKey: "presets.dentalCheckup", cooldownMin: 259200, cooldownMax: 525600, notes: "", category: "health" },
  { i18nKey: "presets.eyeExam", cooldownMin: 525600, cooldownMax: 1051200, notes: "", category: "health" },
];

export async function seedPresets() {
  const seeded = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "seeded"));
  if (seeded.length > 0) return;

  const now = new Date().toISOString();
  for (const p of PRESETS) {
    const { i18nKey, ...rest } = p;
    await db.insert(trackers).values({
      ...rest,
      name: i18n.t(i18nKey),
      notifyEnabled: 1,
      isPreset: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(settings).values({ key: "seeded", value: "true" });
}
