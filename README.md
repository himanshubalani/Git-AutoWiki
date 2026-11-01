# Git AutoWiki

Git AutoWiki is a repository-aware AI assistant for exploring a GitHub codebase through a chat interface. It indexes a repository, stores relevant code chunks in Pinecone, and answers questions grounded in the repo’s actual code using LLM + retrieval.

The app combines:
- a Next.js frontend for the GitWiki UI
- an Express backend for API routes
- async workflows via Inngest
- GitHub repo fetch/indexing
- OpenAI embeddings + Pinecone vector retrieval
- repo-grounded Q&A through LangChain and OpenAI models

## Highlights

- Index a public or private GitHub repo into a repo-scoped Pinecone namespace
- Skip noisy, binary, and lock files while indexing
- Split content into chunks for semantic retrieval
- Store embeddings and fetch the most relevant code snippets
- Ask natural-language questions about architecture, auth, routing, and implementation details
- View the answer in a polished interface with source references and renderable markdown responses

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS
- Express
- Inngest
- Octokit
- LangChain
- OpenAI
- Pinecone
- TypeScript

## Project Structure

```text
.
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts
│   │   └── index/
│   │       └── route.ts
│   ├── components/
│   │   └── ai-elements/
│   │       ├── conversation.tsx
│   │       ├── message.tsx
│   │       ├── prompt-input.tsx
│   │       ├── sources.tsx
│   │       ├── task.tsx
│   │       └── ...
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── index.js
│   ├── inngest/
│   │   ├── client.js
│   │   ├── index.js
│   │   └── functions/
│   │       ├── askQuestions.js
│   │       ├── helloworld.js
│   │       └── indexRepo.js
│   ├── routes/
│   │   ├── chat.routes.js
│   │   └── index.routes.js
│   └── service/
│       ├── chunker.js
│       ├── github.js
│       ├── rag.js
│       └── vectorStore.js
├── .env
├── components.json
├── next-env.d.ts
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
├── README.md
└── UI_SPEC.md
```

## Prerequisites

- Node.js 18+
- pnpm (preferred) or npm
- GitHub token with repo access
- OpenAI API key
- Pinecone API key and target index

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000

GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=git-wiki
```

Optional extras used by the local workflow:

```env
INNGEST_DEV=1
```

## Installation

With pnpm:

```bash
pnpm install
```

With npm:

```bash
npm install
```

## Running the Project

The project runs three local pieces together:
- Express API server
- Next.js app
- Inngest dev server

### Start everything

```bash
pnpm dev
```

### Run individually

```bash
pnpm run server
pnpm run client
pnpm run inngest
```

### Production build

```bash
pnpm build
```

### Start production server

```bash
pnpm start
```

The app is typically available at:

```text
http://localhost:3000
```

## Core API Routes

### 1) Index a repository

POST `/api/index`

Request body:

```json
{
  "repo": "https://github.com/vercel/next.js",
  "githubToken": "ghp_xxx"
}
```

Behavior:
- loads the repo tree from GitHub
- filters out noisy files
- chunks the repo content
- embeds the chunks
- upserts them into Pinecone by repo namespace

### 2) Ask a question about the repo

POST `/api/chat`

Request body:

```json
{
  "repo": "vercel/next.js",
  "question": "How does authentication work?"
}
```

Behavior:
- queries Pinecone for relevant indexed chunks
- sends the results to the LLM
- returns the grounded answer with supporting sources

Example response:

```json
{
  "answer": "Authentication is handled by the middleware layer...",
  "sources": [
    {
      "path": "src/middleware/auth.ts",
      "lines": "Lines 12-38",
      "snippet": "export async function authMiddleware(req: NextRequest) { ... }"
    }
  ]
}
```

## Repo Workflow

1. User enters a GitHub repo URL in the UI
2. The app indexes the repo and stores embeddings in Pinecone
3. User asks a technical question in natural language
4. The app retrieves the most relevant code chunks
5. The LLM answers using those retrieved chunks as context
6. The final answer is returned with source references

## Notes

- The app expects the repo to be indexed before asking semantic questions.
- Pinecone namespace names are derived from the repo slug.
- The frontend and server are intentionally separate, with the UI living under `app/` and the backend logic under `src/`.
- The README may evolve as the app’s retrieval and LLM workflow changes.

## Useful Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

## License

This project is currently set to the ISC license in the package metadata.


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
