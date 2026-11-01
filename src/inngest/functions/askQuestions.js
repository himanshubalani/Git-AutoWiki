import { inngest } from "../client.js";
import { askQuestion } from "../../service/rag.js";

export const askQuestionFn = inngest.createFunction(
  { id: "ask-question", triggers: [{ event: "chat/question.requested" }] },
  async ({ event, step }) => {
    const { repo, question } = event.data;

    console.log("[Inngest] Starting question answering:", { repo, question });

    try {
      const result = await step.run("retrieve-and-answer", async () => {
        const answer = await askQuestion(repo, question);
        console.log("[Inngest] Answer produced:", {
          repo,
          sourceCount: answer.sources.length,
          answerPreview: answer.answer?.slice(0, 250),
        });
        return answer;
      });

      const finalResult = {
        repo,
        question,
        status: "completed",
        answer: result.answer,
        sources: result.sources,
      };

      console.log("[Inngest] Chat job complete:", JSON.stringify(finalResult, null, 2));
      return finalResult;
    } catch (error) {
      console.error("[Inngest] Chat job failed:", error);
      throw error;
    }
  },
);