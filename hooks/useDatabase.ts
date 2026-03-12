import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useEffect, useState } from "react";
import { db } from "../db/client";
import migrations from "../drizzle/migrations";
import { seedPresets } from "../db/seed";
import { rescheduleAllNotifications } from "../lib/notifications";

export function useDatabase() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (success) {
      seedPresets()
        .then(() => rescheduleAllNotifications())
        .then(() => setSeeded(true));
    }
  }, [success]);

  return { isReady: success && seeded, error };
}
