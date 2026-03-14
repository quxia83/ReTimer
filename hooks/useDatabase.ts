import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useEffect, useState } from "react";
import { db } from "../db/client";
import migrations from "../drizzle/migrations";
import { seedPresets } from "../db/seed";
import { rescheduleAllNotifications } from "../lib/notifications";

export function useDatabase() {
  const { success, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (success) {
      seedPresets()
        .then(() => rescheduleAllNotifications())
        .then(() => setSeeded(true))
        .catch((e) => setSeedError(e instanceof Error ? e : new Error(String(e))));
    }
  }, [success]);

  return {
    isReady: success && seeded,
    error: migrationError ?? seedError,
  };
}
