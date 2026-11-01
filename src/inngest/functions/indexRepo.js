import { inngest } from "../client.js";
import { fetchRepoFiles } from "../../service/github.js";
import { chunkFiles } from "../../service/chunker.js";
import { saveChunks } from "../../service/vectorStore.js";

export const indexRepo = inngest.createFunction(
  { id: "index-repo", triggers: [{ event: "repo/index.requested" }] },
  async ({ event, step }) => {
    const { githubToken, owner, repo } = event.data;

    const repoName = repo.replace(/\.git$/, "");
    const repoKey = `${owner}/${repoName}`;

    console.log("[Inngest] Starting repo indexing:", { repoKey, owner, repoName, githubTokenProvided: Boolean(githubToken) });

    const files = await step.run("fetch-github-files", async () => {
      const fetchedFiles = await fetchRepoFiles(githubToken, owner, repoName);
      console.log("[Inngest] GitHub fetch complete:", { repoKey, fileCount: fetchedFiles.length });
      return fetchedFiles;
    });

    const documents = await step.run("chunk-files", async () => {
      const chunkedDocs = await chunkFiles(files, repoKey);
      console.log("[Inngest] Chunking complete:", { repoKey, chunkCount: chunkedDocs.length });
      return chunkedDocs;
    });

    const saveResult = await step.run("save-to-pinecone", async () => {
      const result = await saveChunks(repoKey, documents);
      console.log("[Inngest] Pinecone save complete:", { repoKey, saved: result.saved, chunkCount: result.chunkCount });
      return result;
    });

    const finalResult = {
      repo: repoKey,
      fileCount: files.length,
      chunkCount: documents.length,
      saved: saveResult.saved,
    };

    console.log("[Inngest] Repo indexing finished:", finalResult);
    return finalResult;
  },
);