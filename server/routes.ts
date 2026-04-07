import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAttemptSchema } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const SYSTEM_PROMPT = `You are a Fermi estimation tutor for students. Help them develop estimation skills.

CORE APPROACH: Work BACKWARDS from the known correct answer. Reverse-engineer a valid estimation path to the known destination. This prevents hallucination.

TECHNIQUES:
1. Divide and Conquer — break into 2-4 independent factors
2. Round aggressively — 87 million → 100 million = 10^8
3. Ignore factors with <2x effect
4. Geometric Mean — if bounds are [low, high], estimate √(low × high)
5. Three-Assumptions Protocol — name assumptions, star the weakest

WHEN EXPLAINING (mode: "explain"):
- Acknowledge how close/far the student was
- Show step-by-step estimation arriving at the correct power of 10
- Name each factor, show multiplication
- Point out where the student likely diverged
- End with encouragement

WHEN GIVING HINTS (mode: "hint"):
- Don't reveal the answer
- Give ONE helpful starting point
- Ask a guiding question

FORMATTING RULES (CRITICAL — follow exactly):
- Write in plain text only. No markdown headers (no #, ##, ###).
- No horizontal rules (no ---).
- No LaTeX or math notation (no $$, no \frac, no \times, no \approx).
- For math, write it inline like: (2 × 10^7) / (2.5 × 10^5) ≈ 80 ≈ 10^2
- Use plain numbered lists (1. 2. 3.) for steps.
- Use plain text emphasis, not *asterisks* or **bold**.
- No emojis.
- Write as if you're speaking to the student in person.

IMPORTANT: The "answer" field is the exponent (power of 10). answer=4 means ~10^4 = 10,000.

TONE: Conversational, warm, encouraging. Keep responses 150-250 words.`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── PROBLEMS ────────────────────────────────────────────────────────────────

  app.get("/api/problems", (req, res) => {
    const { category, difficulty, topic, limit, offset } = req.query;
    const filters: any = {};
    if (category) filters.category = String(category);
    if (difficulty) filters.difficulty = String(difficulty);
    if (topic) filters.topic = String(topic);
    if (limit) filters.limit = parseInt(String(limit), 10);
    if (offset) filters.offset = parseInt(String(offset), 10);

    const result = storage.getProblems(filters);
    res.json(result);
  });

  app.get("/api/problems/random", (req, res) => {
    const { category, difficulty, topic } = req.query;
    const filters: any = {};
    if (category) filters.category = String(category);
    if (difficulty) filters.difficulty = String(difficulty);
    if (topic) filters.topic = String(topic);

    const problem = storage.getRandomProblem(filters);
    if (!problem) {
      return res.status(404).json({ error: "No problems found matching filters" });
    }
    res.json(problem);
  });

  app.get("/api/problems/categories", (req, res) => {
    const allProblems = storage.getProblems({});
    const counts: Record<string, number> = {};
    for (const p of allProblems) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    const result = Object.entries(counts).map(([category, count]) => ({ category, count }));
    res.json(result);
  });

  app.get("/api/problems/difficulties", (req, res) => {
    const allProblems = storage.getProblems({});
    const counts: Record<string, number> = {};
    for (const p of allProblems) {
      counts[p.difficulty] = (counts[p.difficulty] ?? 0) + 1;
    }
    const result = Object.entries(counts).map(([difficulty, count]) => ({ difficulty, count }));
    res.json(result);
  });

  app.get("/api/problems/topics", (req, res) => {
    const allProblems = storage.getProblems({});
    const counts: Record<string, number> = {};
    for (const p of allProblems) {
      counts[p.topic] = (counts[p.topic] ?? 0) + 1;
    }
    const result = Object.entries(counts).map(([topic, count]) => ({ topic, count }));
    res.json(result);
  });

  app.get("/api/problems/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const problem = storage.getProblemById(id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json(problem);
  });

  // ─── SESSIONS ────────────────────────────────────────────────────────────────

  app.post("/api/sessions", (_req, res) => {
    const session = storage.createSession();
    res.status(201).json(session);
  });

  app.get("/api/sessions/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const session = storage.getSession(id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  });

  app.patch("/api/sessions/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const updated = storage.updateSession(id, req.body);
    if (!updated) return res.status(404).json({ error: "Session not found" });
    res.json(updated);
  });

  // ─── ATTEMPTS ────────────────────────────────────────────────────────────────

  app.post("/api/attempts", (req, res) => {
    const attemptBodySchema = z.object({
      sessionId: z.number().int(),
      problemId: z.number().int(),
      userAnswer: z.number(),
      assumptions: z.array(z.string()).optional(),
      weakestAssumption: z.string().optional(),
    });

    const parsed = attemptBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { sessionId, problemId, userAnswer, assumptions, weakestAssumption } = parsed.data;

    const problem = storage.getProblemById(problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const session = storage.getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Compute order of magnitude from userAnswer
    const userOrderOfMagnitude = userAnswer === 0 ? 0 : Math.round(Math.log10(Math.abs(userAnswer)));
    const correctAnswer = problem.answer;
    const error = Math.abs(userOrderOfMagnitude - correctAnswer);

    const attempt = storage.createAttempt({
      sessionId,
      problemId,
      userAnswer,
      userOrderOfMagnitude,
      correctAnswer,
      error,
      assumptions: assumptions ? JSON.stringify(assumptions) : null,
      weakestAssumption: weakestAssumption ?? null,
      createdAt: new Date().toISOString(),
    });

    // Update session stats
    const newTotal = session.totalQuestions + 1;
    const newTotalError = session.totalError + error;
    const newWithinOne = session.withinOneOrder + (error <= 1 ? 1 : 0);
    storage.updateSession(sessionId, {
      totalQuestions: newTotal,
      totalError: newTotalError,
      withinOneOrder: newWithinOne,
    });

    res.status(201).json(attempt);
  });

  app.get("/api/attempts/session/:sessionId", (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid sessionId" });
    const result = storage.getAttemptsBySession(sessionId);
    res.json(result);
  });

  // ─── STATS ───────────────────────────────────────────────────────────────────

  app.get("/api/stats", (_req, res) => {
    const stats = storage.getStats();
    res.json(stats);
  });

  // ─── AI TUTOR CHAT ───────────────────────────────────────────────────────────

  app.post("/api/chat", async (req, res) => {
    const { question, correctAnswer, userAnswer, userOrderOfMagnitude, mode, message } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const client = new Anthropic();

      let userPrompt = "";
      if (mode === "explain") {
        userPrompt = `The student was asked: "${question}"\nCorrect answer: 10^${correctAnswer}\nThe student guessed: ${userAnswer} (which is 10^${userOrderOfMagnitude})\nThey were off by ${Math.abs(userOrderOfMagnitude - correctAnswer)} order(s) of magnitude.\n\nPlease explain how to estimate this, working backwards from the correct answer of 10^${correctAnswer}.`;
      } else if (mode === "hint") {
        userPrompt = `The student is working on: "${question}"\nDon't reveal the answer (10^${correctAnswer}). Give them a helpful hint to get started.`;
      } else {
        userPrompt = `Context: The student is working on "${question}" (correct answer: 10^${correctAnswer}).\nStudent's message: ${message}`;
      }

      const stream = await client.messages.stream({
        model: "claude_sonnet_4_6",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      console.error("Chat error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message ?? "Unknown error" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // ─── SEED ON STARTUP ─────────────────────────────────────────────────────────

  const existingProblems = storage.getProblems({});
  if (existingProblems.length === 0) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const problemsPath = path.join(process.cwd(), "client", "public", "problems.json");
      const raw = fs.readFileSync(problemsPath, "utf-8");
      const problemsData = JSON.parse(raw);
      storage.seedProblems(problemsData);
      console.log(`Seeded ${problemsData.length} problems.`);
    } catch (err) {
      console.error("Failed to seed problems:", err);
    }
  }

  return httpServer;
}
