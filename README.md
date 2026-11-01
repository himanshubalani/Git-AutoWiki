# Git AutoWiki

Git AutoWiki is a repository-aware AI assistant that indexes a GitHub codebase into a vector store and answers natural-language questions about the project using retrieval-augmented generation (RAG).

It fetches repository files from GitHub, skips noisy/binary files, chunks the remaining content, embeds the chunks using OpenAI embeddings, stores them in Pinecone, and then answers questions against the repo-specific vector index.

## Features

- GitHub repo indexing
- Automatic file filtering and chunking
- OpenAI embeddings
- Pinecone vector storage by repo namespace
- Repo-grounded Q&A via LangChain + OpenAI
- Async job execution with Inngest
- Express API for triggering indexing and chat flows

## Tech Stack

- Node.js + Express
- Inngest for async workflows
- Octokit for GitHub API access
- LangChain + OpenAI for embeddings and LLM answers
- Pinecone for vector search
- Docker-free local setup

## Project Structure

```text
src/
  index.js
  inngest/
    client.js
    index.js
    functions/
      askQuestions.js
      helloworld.js
      indexRepo.js
  routes/
    chat.routes.js
    index.routes.js
  service/
    chunker.js
    github.js
    rag.js
    vectorStore.js
```

## Prerequisites

- Node.js 18+
- npm or pnpm
- GitHub token with repository access
- OpenAI API key
- Pinecone API key and index

## Environment Variables

Create a `.env` file in the project root with the following values:

```env
INNGEST_DEV=1
PORT=3000

GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=git-wiki
```

## Installation

```bash
npm install
```

Or with pnpm:

```bash
pnpm install
```

## Run the App

```bash
npm run dev
```

This starts the server with nodemon:

```bash
nodemon src/index.js
```

The app listens on port `3000` by default.

## API Specification

### Base URL

```text
http://localhost:3000
```

### 1) Health check

#### GET /

Returns a simple server response.

Example:

```bash
curl http://localhost:3000/
```

Example response:

```text
hello world
```

---

### 2) Index a repository

#### POST /api/index

Triggers the repo indexing pipeline asynchronously through Inngest.

Request body:

```json
{
  "repo": "https://github.com/owner/repo",
  "githubToken": "ghp_xxx"
}
```

Behavior:

- Parses owner/repo from the GitHub URL
- Uses the provided token or falls back to `GITHUB_TOKEN`
- Sends the event `repo/index.requested`
- Starts the indexing workflow in the background

Example:

```bash
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "https://github.com/vercel/next.js",
    "githubToken": "ghp_xxx"
  }'
```

Example response:

```json
"Repo Indexing"
```

The indexing job internally performs:

1. GitHub file fetch
2. File filtering
3. Chunking
4. Embedding
5. Pinecone upsert

Success payload returned by the Inngest job:

```json
{
  "repo": "owner/repo",
  "fileCount": 42,
  "chunkCount": 180,
  "saved": true
}
```

---

### 3) Ask a question about an indexed repository

#### POST /api/chat

Triggers the repo-grounded Q&A flow.

Request body:

```json
{
  "repo": "https://github.com/owner/repo",
  "question": "How does authentication work?"
}
```

Behavior:

- Parses the repo name
- Sends the event `chat/question.requested`
- Executes the retrieval pipeline against the repo namespace in Pinecone
- Sends the top matching chunks to the OpenAI model
- Returns the final answer and source files

Example:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "https://github.com/owner/repo",
    "question": "How does authentication work in this project?"
  }'
```

Example response:

```json
{
  "repo": "owner/repo",
  "question": "How does authentication work in this project?",
  "status": "completed",
  "answer": "Authentication is handled by the middleware in the auth layer...",
  "sources": [
    "src/auth.js",
    "src/middleware/auth.js",
    "README.md"
  ]
}
```

If no matching content is found for a repo, the backend returns:

```json
{
  "answer": "No indexed content was found for this repo. Index it first, then try again.",
  "sources": []
}
```

---

### 4) Inngest endpoint

#### POST /api/inngest

This is the Inngest webhook endpoint used by Inngest to receive and execute function triggers.

It is not typically called directly by a user-facing API client; it is used by Inngest itself.

---

## Inngest Events

The app registers the following events:

### `repo/index.requested`

Triggered by `POST /api/index`

Data:

```json
{
  "githubToken": "ghp_xxx",
  "owner": "owner",
  "repo": "repo",
  "repoKey": "owner/repo"
}
```

### `chat/question.requested`

Triggered by `POST /api/chat`

Data:

```json
{
  "repo": "owner/repo",
  "question": "How does authentication work?"
}
```

---

## Data Flow

### Repo indexing flow

1. Client sends `POST /api/index`
2. Express route parses repository information
3. Inngest event `repo/index.requested` is emitted
4. Index job fetches repository files from GitHub
5. Files are filtered and chunked
6. Chunks are embedded and saved to Pinecone
7. Result includes repo name, file count, chunk count, and save status

### Chat flow

1. Client sends `POST /api/chat`
2. Express route validates repo + question
3. Inngest event `chat/question.requested` is emitted
4. Question handler searches repo namespace in Pinecone
5. Top matching chunks are passed into the OpenAI chat model
6. Answer and source list are returned

---

## File Filtering Rules

The GitHub fetcher intentionally skips large or noisy files such as:

- `node_modules`
- `.git`
- `dist`, `build`, `coverage`, `.next`
- binary assets like PNG, JPG, GIF, SVG, PDF, ZIP, etc.
- lock files such as `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`
- files over 200 KB

This keeps indexing focused on source and documentation files.

---

## Notes

- The app currently uses a simple Express server and asynchronous Inngest jobs; it does not yet expose a full status polling API for indexing jobs.
- The app expects repo indexing and chat jobs to run in an environment where the relevant service credentials are configured.
- `repo` values are normalized to `owner/repo` form using the GitHub URL parser.

## Example Commands

```bash
npm install
npm run dev
```

Then test the server:

```bash
curl http://localhost:3000/
```

Index a repo:

```bash
curl -X POST http://localhost:3000/api/index \
  -H "Content-Type: application/json" \
  -d '{"repo":"https://github.com/microsoft/vscode"}'
```

Ask a question:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"repo":"https://github.com/microsoft/vscode","question":"What is this project about?"}'
```

## License

ISC
