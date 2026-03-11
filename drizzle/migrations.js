// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';

const m0000 = `CREATE TABLE \`dose_logs\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`medication_id\` integer NOT NULL,
\t\`taken_at\` text NOT NULL,
\t\`created_at\` text NOT NULL,
\tFOREIGN KEY (\`medication_id\`) REFERENCES \`medications\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`medications\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`name\` text NOT NULL,
\t\`cooldown_min\` integer NOT NULL,
\t\`cooldown_max\` integer NOT NULL,
\t\`notes\` text,
\t\`notify_enabled\` integer DEFAULT 1 NOT NULL,
\t\`is_preset\` integer DEFAULT 0 NOT NULL,
\t\`created_at\` text NOT NULL,
\t\`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`settings\` (
\t\`key\` text PRIMARY KEY NOT NULL,
\t\`value\` text NOT NULL
);`;

  export default {
    journal,
    migrations: {
      m0000
    }
  }
