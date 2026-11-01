import { ChatOpenAI } from "@langchain/openai";
import { search } from "./vectorStore.js";

function toText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part.text ?? ""))
      .join("");
  }
  return String(content ?? "");
}

export async function askQuestion(repo, question, topK = 5) {
  console.log("[RAG] Searching repo vector store:", { repo, question, topK });
  const docs = await search(repo, question, topK);

  if (!docs.length) {
    console.log("[RAG] No matching docs found for repo:", repo);
    return {
      answer: "No indexed content was found for this repo. Index it first, then try again.",
      sources: [],
    };
  }

  console.log("[RAG] Matching docs found:", docs.length, docs.map((doc) => doc.metadata.path));

  const context = docs
    .map((doc) => `File: ${doc.metadata.path}\n${doc.pageContent}`)
    .join("\n\n");

  const llm = new ChatOpenAI({ model: "gpt-5.6-luna" });
  const response = await llm.invoke(
    `Answer using this repo context only.\n\n${context}\n\nQuestion: ${question}`,
  );

  const answer = toText(response.content);
  const sources = [...new Set(docs.map((doc) => doc.metadata.path).filter(Boolean))];

  console.log("[RAG] Final answer generated:", {
    repo,
    sources,
    answerPreview: answer.slice(0, 250),
  });

  return { answer, sources };
}