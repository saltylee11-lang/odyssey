import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  integer,
  boolean,
  time,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  birthdate: date("birthdate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    summary: text("summary").notNull(),
    tags: text("tags").array().default([]).notNull(),
    dayNumber: integer("day_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("entries_user_id_idx").on(table.userId),
    dayNumberIdx: index("entries_day_number_idx").on(table.dayNumber),
    tagsIdx: index("entries_tags_idx").using("gin", table.tags),
  })
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .references(() => journalEntries.id, { onDelete: "cascade" })
      .notNull(),
    sequence: integer("sequence").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    entrySeqUnique: uniqueIndex("ai_msg_entry_seq_unique").on(table.entryId, table.sequence),
  })
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    time: time("time").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    lastSent: timestamp("last_sent", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userUnique: uniqueIndex("reminder_user_unique").on(table.userId),
  })
);
