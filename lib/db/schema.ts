import {
  bigserial,
  customType,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Note: `auth.users` is managed by Supabase; we reference its `id` (uuid) but
// do not declare it here. Foreign keys are enforced at the SQL level via the
// migrations under `lib/db/migrations`.

const bytea = customType<{ data: Uint8Array; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const assessmentKind = pgEnum("assessment_kind", [
  "diagnostic",
  "quiz",
  "exercise",
]);

export const tutorRole = pgEnum("tutor_role", ["user", "assistant", "tool"]);

export const codeRuntime = pgEnum("code_runtime", ["pyodide", "colab"]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const onboardingResponses = pgTable("onboarding_responses", {
  userId: uuid("user_id").primaryKey(),
  goals: jsonb("goals").$type<string[]>().notNull().default([]),
  timePerWeekMin: integer("time_per_week_min"),
  priorKnowledge: jsonb("prior_knowledge").$type<Record<string, unknown>>().notNull().default({}),
  learningStyle: text("learning_style"),
  painPoints: jsonb("pain_points").$type<string[]>().notNull().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const topicMastery = pgTable(
  "topic_mastery",
  {
    userId: uuid("user_id").notNull(),
    topicId: text("topic_id").notNull(),
    score: integer("score").notNull().default(0),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
    streak: integer("streak").notNull().default(0),
    notes: text("notes"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.topicId] }),
  }),
);

export const assessments = pgTable("assessments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id").notNull(),
  topicId: text("topic_id").notNull(),
  kind: assessmentKind("kind").notNull(),
  prompt: jsonb("prompt").notNull(),
  response: jsonb("response"),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tutorSessions = pgTable("tutor_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  topicId: text("topic_id"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const tutorMessages = pgTable("tutor_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionId: uuid("session_id").notNull(),
  role: tutorRole("role").notNull(),
  ciphertext: bytea("ciphertext").notNull(),
  nonce: bytea("nonce").notNull(),
  provider: text("provider"),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const codeSubmissions = pgTable("code_submissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id").notNull(),
  topicId: text("topic_id").notNull(),
  source: text("source").notNull(),
  runtime: codeRuntime("runtime").notNull(),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
