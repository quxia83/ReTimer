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
  category?: string;
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
