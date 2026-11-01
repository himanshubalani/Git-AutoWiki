import { Router } from "express";
import { parseRepo } from "../service/github.js";
import { askQuestion } from "../service/rag.js";

const router = Router();

router.post("/", async (req, res) => {
  const { repo, question } = req.body ?? {};

  if (!repo || !question) {
    return res.status(400).json({ error: "repo and question are required" });
  }

  const { repoKey } = parseRepo(repo);

  try {
    const result = await askQuestion(repoKey, question);

    return res.status(200).json({
      repo: repoKey,
      question,
      status: "completed",
      answer: result.answer,
      sources: result.sources.map((src) => ({
        path: src,
        lines: "Indexed Context",
        snippet: `Source file referenced from vector search: ${src}`,
      })),
    });
  } catch (error) {
    console.error("[API] Chat processing error:", error);
    return res.status(500).json({
      error: error.message || "Failed to process chat question",
    });
  }
});

export default router;