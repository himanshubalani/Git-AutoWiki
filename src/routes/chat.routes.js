import { Router } from "express";
import { inngest } from "../inngest/client.js";
import { parseRepo } from "../service/github.js";

const router = Router();

async function startChatJob(repo, question) {
  const { repoKey } = parseRepo(repo);

  console.log("[API] Chat question received:", {
    repo,
    repoKey,
    question,
  });

  await inngest.send({
    name: "chat/question.requested",
    data: { repo: repoKey, question },
  });

  console.log("[API] Chat event sent to Inngest:", { repoKey, question });
  return "check your inngest";
}

router.post("/", async (req, res) => {
  const { repo, question } = req.body ?? {};

  if (!repo || !question) {
    console.log("[API] Chat request rejected: repo and question are required");
    return res.status(400).json({ error: "repo and question are required" });
  }

  const response = await startChatJob(repo, question);
  console.log("[API] Chat response sent to client:", response);
  res.status(202).json(response);
});

export default router;