import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const trackers = sqliteTable("trackers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cooldownMin: integer("cooldown_min").notNull(), // minutes
  cooldownMax: integer("cooldown_max").notNull(), // minutes
  notes: text("notes"),
  category: text("category").default("other"),
  notifyEnabled: integer("notify_enabled").notNull().default(1),
  isPreset: integer("is_preset").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const entryLogs = sqliteTable("entry_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackerId: integer("tracker_id")
    .notNull()
    .references(() => trackers.id, { onDelete: "cascade" }),
  loggedAt: text("logged_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
