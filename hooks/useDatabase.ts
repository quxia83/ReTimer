import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useEffect } from "react";
import { db } from "../db/client";
import migrations from "../drizzle/migrations";
import { rescheduleAllNotifications } from "../lib/notifications";

export function useDatabase() {
  const { success, error } = useMigrations(db, migrations);

  // Re-schedule notifications for active cooldowns on app launch
  useEffect(() => {
    if (success) {
      rescheduleAllNotifications();
    }
  }, [success]);

  return { isReady: success, error };
}
