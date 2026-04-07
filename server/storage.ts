import {
  problems,
  sessions,
  attempts,
  type Problem,
  type InsertProblem,
  type Session,
  type InsertSession,
  type Attempt,
  type InsertAttempt,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, sql } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

// Create tables if they don't exist (push schema)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL UNIQUE,
    question TEXT NOT NULL,
    answer INTEGER NOT NULL,
    source TEXT NOT NULL,
    number INTEGER,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    topic TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    total_error REAL NOT NULL DEFAULT 0,
    within_one_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    problem_id INTEGER NOT NULL REFERENCES problems(id),
    user_answer REAL NOT NULL,
    user_order_of_magnitude INTEGER NOT NULL,
    correct_answer INTEGER NOT NULL,
    error INTEGER NOT NULL,
    assumptions TEXT,
    weakest_assumption TEXT,
    created_at TEXT NOT NULL
  );
`);

export interface IStorage {
  getProblems(filters?: { category?: string; difficulty?: string; topic?: string; limit?: number; offset?: number }): Problem[];
  getProblemById(id: number): Problem | undefined;
  getRandomProblem(filters?: { category?: string; difficulty?: string; topic?: string }): Problem | undefined;
  createSession(): Session;
  getSession(id: number): Session | undefined;
  updateSession(id: number, data: Partial<Session>): Session | undefined;
  createAttempt(data: InsertAttempt): Attempt;
  getAttemptsBySession(sessionId: number): Attempt[];
  getStats(): {
    totalAttempts: number;
    avgError: number;
    accuracy: number;
    byCategory: Record<string, { count: number; avgError: number }>;
    byDifficulty: Record<string, { count: number; avgError: number }>;
  };
  seedProblems(problems: any[]): void;
}

export class DatabaseStorage implements IStorage {
  getProblems(filters?: { category?: string; difficulty?: string; topic?: string; limit?: number; offset?: number }): Problem[] {
    let query = db.select().from(problems);

    const conditions: any[] = [];
    if (filters?.category) conditions.push(eq(problems.category, filters.category));
    if (filters?.difficulty) conditions.push(eq(problems.difficulty, filters.difficulty));
    if (filters?.topic) conditions.push(eq(problems.topic, filters.topic));

    if (conditions.length > 0) {
      // Apply filters using raw SQL to avoid complexity with dynamic conditions
      let whereClause = conditions.map((_, i) => {
        if (i === 0 && filters?.category) return `category = '${filters.category}'`;
        if (i === 0 && filters?.difficulty) return `difficulty = '${filters.difficulty}'`;
        if (i === 0 && filters?.topic) return `topic = '${filters.topic}'`;
        return "";
      });
      // Use a simpler approach with drizzle's and()
    }

    // Build raw query for simplicity with multiple optional filters
    let rawSql = "SELECT * FROM problems WHERE 1=1";
    const params: any[] = [];
    if (filters?.category) { rawSql += " AND category = ?"; params.push(filters.category); }
    if (filters?.difficulty) { rawSql += " AND difficulty = ?"; params.push(filters.difficulty); }
    if (filters?.topic) { rawSql += " AND topic = ?"; params.push(filters.topic); }
    if (filters?.limit) { rawSql += " LIMIT ?"; params.push(filters.limit); }
    if (filters?.offset) { rawSql += " OFFSET ?"; params.push(filters.offset); }

    const stmt = sqlite.prepare(rawSql);
    return stmt.all(...params) as Problem[];
  }

  getProblemById(id: number): Problem | undefined {
    return db.select().from(problems).where(eq(problems.id, id)).get();
  }

  getRandomProblem(filters?: { category?: string; difficulty?: string; topic?: string }): Problem | undefined {
    let rawSql = "SELECT * FROM problems WHERE 1=1";
    const params: any[] = [];
    if (filters?.category) { rawSql += " AND category = ?"; params.push(filters.category); }
    if (filters?.difficulty) { rawSql += " AND difficulty = ?"; params.push(filters.difficulty); }
    if (filters?.topic) { rawSql += " AND topic = ?"; params.push(filters.topic); }
    rawSql += " ORDER BY RANDOM() LIMIT 1";

    const stmt = sqlite.prepare(rawSql);
    return stmt.get(...params) as Problem | undefined;
  }

  createSession(): Session {
    const now = new Date().toISOString();
    return db.insert(sessions).values({ startedAt: now, totalQuestions: 0, totalError: 0, withinOneOrder: 0 }).returning().get();
  }

  getSession(id: number): Session | undefined {
    return db.select().from(sessions).where(eq(sessions.id, id)).get();
  }

  updateSession(id: number, data: Partial<Session>): Session | undefined {
    const existing = this.getSession(id);
    if (!existing) return undefined;

    const updates: any = {};
    if (data.totalQuestions !== undefined) updates.totalQuestions = data.totalQuestions;
    if (data.totalError !== undefined) updates.totalError = data.totalError;
    if (data.withinOneOrder !== undefined) updates.withinOneOrder = data.withinOneOrder;

    if (Object.keys(updates).length === 0) return existing;

    return db.update(sessions).set(updates).where(eq(sessions.id, id)).returning().get();
  }

  createAttempt(data: InsertAttempt): Attempt {
    return db.insert(attempts).values(data).returning().get();
  }

  getAttemptsBySession(sessionId: number): Attempt[] {
    return db.select().from(attempts).where(eq(attempts.sessionId, sessionId)).all();
  }

  getStats(): {
    totalAttempts: number;
    avgError: number;
    accuracy: number;
    byCategory: Record<string, { count: number; avgError: number }>;
    byDifficulty: Record<string, { count: number; avgError: number }>;
  } {
    const allAttempts = db.select().from(attempts).all();
    const totalAttempts = allAttempts.length;

    if (totalAttempts === 0) {
      return { totalAttempts: 0, avgError: 0, accuracy: 0, byCategory: {}, byDifficulty: {} };
    }

    const totalError = allAttempts.reduce((sum, a) => sum + a.error, 0);
    const avgError = totalError / totalAttempts;
    const withinOne = allAttempts.filter(a => a.error <= 1).length;
    const accuracy = (withinOne / totalAttempts) * 100;

    // Build category and difficulty breakdowns by joining with problems
    const allWithProblems = sqlite.prepare(`
      SELECT a.error, p.category, p.difficulty
      FROM attempts a
      JOIN problems p ON a.problem_id = p.id
    `).all() as Array<{ error: number; category: string; difficulty: string }>;

    const byCategory: Record<string, { count: number; avgError: number; totalError: number }> = {};
    const byDifficulty: Record<string, { count: number; avgError: number; totalError: number }> = {};

    for (const row of allWithProblems) {
      if (!byCategory[row.category]) byCategory[row.category] = { count: 0, avgError: 0, totalError: 0 };
      byCategory[row.category].count++;
      byCategory[row.category].totalError += row.error;

      if (!byDifficulty[row.difficulty]) byDifficulty[row.difficulty] = { count: 0, avgError: 0, totalError: 0 };
      byDifficulty[row.difficulty].count++;
      byDifficulty[row.difficulty].totalError += row.error;
    }

    // Compute averages
    for (const key of Object.keys(byCategory)) {
      byCategory[key].avgError = byCategory[key].totalError / byCategory[key].count;
    }
    for (const key of Object.keys(byDifficulty)) {
      byDifficulty[key].avgError = byDifficulty[key].totalError / byDifficulty[key].count;
    }

    // Strip totalError from output
    const byCategoryOut: Record<string, { count: number; avgError: number }> = {};
    const byDifficultyOut: Record<string, { count: number; avgError: number }> = {};
    for (const [k, v] of Object.entries(byCategory)) byCategoryOut[k] = { count: v.count, avgError: v.avgError };
    for (const [k, v] of Object.entries(byDifficulty)) byDifficultyOut[k] = { count: v.count, avgError: v.avgError };

    return { totalAttempts, avgError, accuracy, byCategory: byCategoryOut, byDifficulty: byDifficultyOut };
  }

  seedProblems(problemsData: any[]): void {
    const insert = sqlite.prepare(`
      INSERT OR IGNORE INTO problems (question_id, question, answer, source, number, category, difficulty, topic)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = sqlite.transaction((rows: any[]) => {
      for (const p of rows) {
        insert.run(
          p.id ?? p.questionId,
          p.question,
          p.answer,
          p.source ?? "",
          p.number ?? null,
          p.category ?? "general",
          p.difficulty ?? "medium",
          p.topic ?? "general"
        );
      }
    });

    insertMany(problemsData);
  }
}

export const storage = new DatabaseStorage();
