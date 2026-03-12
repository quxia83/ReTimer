import { db } from "../client";
import { entryLogs, trackers } from "../schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function logEntry(trackerId: number, loggedAt?: Date) {
  const now = new Date().toISOString();
  return db.insert(entryLogs).values({
    trackerId,
    loggedAt: loggedAt ? loggedAt.toISOString() : now,
    createdAt: now,
  });
}

export async function getLastEntry(trackerId: number) {
  const rows = await db
    .select()
    .from(entryLogs)
    .where(eq(entryLogs.trackerId, trackerId))
    .orderBy(desc(entryLogs.loggedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getEntryHistory(trackerId?: number, limit = 100, offset = 0) {
  const query = db
    .select({
      id: entryLogs.id,
      trackerId: entryLogs.trackerId,
      trackerName: trackers.name,
      trackerCategory: trackers.category,
      loggedAt: entryLogs.loggedAt,
    })
    .from(entryLogs)
    .innerJoin(trackers, eq(entryLogs.trackerId, trackers.id))
    .orderBy(desc(entryLogs.loggedAt))
    .limit(limit)
    .offset(offset);

  if (trackerId) {
    return query.where(eq(entryLogs.trackerId, trackerId));
  }
  return query;
}

export async function getEntryHistoryByCategory(category: string, limit = 100, offset = 0) {
  const catTrackers = await db
    .select({ id: trackers.id })
    .from(trackers)
    .where(eq(trackers.category, category));

  const trackerIds = catTrackers.map((t) => t.id);
  if (trackerIds.length === 0) return [];

  return db
    .select({
      id: entryLogs.id,
      trackerId: entryLogs.trackerId,
      trackerName: trackers.name,
      trackerCategory: trackers.category,
      loggedAt: entryLogs.loggedAt,
    })
    .from(entryLogs)
    .innerJoin(trackers, eq(entryLogs.trackerId, trackers.id))
    .where(inArray(entryLogs.trackerId, trackerIds))
    .orderBy(desc(entryLogs.loggedAt))
    .limit(limit)
    .offset(offset);
}

export async function deleteEntryLog(id: number) {
  return db.delete(entryLogs).where(eq(entryLogs.id, id));
}

export async function clearAllEntryLogs() {
  return db.delete(entryLogs);
}
