import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Problems table - stores Fermi problems
export const problems = sqliteTable("problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: text("question_id").notNull().unique(),
  question: text("question").notNull(),
  answer: integer("answer").notNull(), // power of 10 (exponent)
  source: text("source").notNull(),
  number: integer("number"),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  topic: text("topic").notNull(),
});

export const insertProblemSchema = createInsertSchema(problems).omit({
  id: true,
});
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problems.$inferSelect;

// Sessions table - tracks practice sessions
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(), // ISO timestamp
  totalQuestions: integer("total_questions").notNull().default(0),
  totalError: real("total_error").notNull().default(0),
  withinOneOrder: integer("within_one_order").notNull().default(0),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Attempts table - individual problem attempts
export const attempts = sqliteTable("attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id),
  problemId: integer("problem_id").notNull().references(() => problems.id),
  userAnswer: real("user_answer").notNull(),
  userOrderOfMagnitude: integer("user_order_of_magnitude").notNull(),
  correctAnswer: integer("correct_answer").notNull(),
  error: integer("error").notNull(), // |userOrderOfMagnitude - correctAnswer|
  assumptions: text("assumptions"), // JSON string array, nullable
  weakestAssumption: text("weakest_assumption"),
  createdAt: text("created_at").notNull(),
});

export const insertAttemptSchema = createInsertSchema(attempts).omit({
  id: true,
});
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type Attempt = typeof attempts.$inferSelect;
