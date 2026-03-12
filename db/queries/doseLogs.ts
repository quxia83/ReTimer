import { db } from "../client";
import { doseLogs, medications } from "../schema";
import { eq, desc } from "drizzle-orm";

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

export async function getDoseHistory(medicationId?: number, limit = 100, offset = 0) {
  const query = db
    .select({
      id: doseLogs.id,
      medicationId: doseLogs.medicationId,
      medicationName: medications.name,
      takenAt: doseLogs.takenAt,
    })
    .from(doseLogs)
    .innerJoin(medications, eq(doseLogs.medicationId, medications.id))
    .orderBy(desc(doseLogs.takenAt))
    .limit(limit)
    .offset(offset);

  if (medicationId) {
    return query.where(eq(doseLogs.medicationId, medicationId));
  }
  return query;
}

export async function deleteDoseLog(id: number) {
  return db.delete(doseLogs).where(eq(doseLogs.id, id));
}

export async function clearAllDoseLogs() {
  return db.delete(doseLogs);
}
