import { db } from "../client";
import { trackers } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllTrackers(includeArchived = false) {
  if (includeArchived) {
    return db.select().from(trackers);
  }
  return db.select().from(trackers).where(eq(trackers.isArchived, 0));
}

export async function getArchivedTrackers() {
  return db.select().from(trackers).where(eq(trackers.isArchived, 1));
}

export async function archiveTracker(id: number) {
  return db
    .update(trackers)
    .set({ isArchived: 1, updatedAt: new Date().toISOString() })
    .where(eq(trackers.id, id));
}

export async function unarchiveTracker(id: number) {
  return db
    .update(trackers)
    .set({ isArchived: 0, updatedAt: new Date().toISOString() })
    .where(eq(trackers.id, id));
}

export async function getTracker(id: number) {
  const rows = await db.select().from(trackers).where(eq(trackers.id, id));
  return rows[0] ?? null;
}

export async function insertTracker(data: {
  name: string;
  cooldownMin: number;
  cooldownMax: number;
  notes?: string;
  category?: string;
  notifyEnabled?: number;
  isPreset?: number;
}) {
  const now = new Date().toISOString();
  return db.insert(trackers).values({
    ...data,
    notifyEnabled: data.notifyEnabled ?? 1,
    isPreset: data.isPreset ?? 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateTracker(
  id: number,
  data: Partial<{ name: string; cooldownMin: number; cooldownMax: number; notes: string; category: string; notifyEnabled: number }>
) {
  return db
    .update(trackers)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(trackers.id, id));
}

export async function deleteTracker(id: number) {
  return db.delete(trackers).where(eq(trackers.id, id));
}
