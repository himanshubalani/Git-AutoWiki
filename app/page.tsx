"use client";

import * as React from "react";
import {
  GitBranch,
  Terminal,
  Database,
  ShieldCheck,
  Sun,
  Moon,
  Layers,
  X,
  Trash2,
  FolderGit2,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Conversation } from "@/components/ai-elements/conversation";
import { Message } from "@/components/ai-elements/message";
import { Sources, SourceItem } from "@/components/ai-elements/sources";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { TaskProgress, TaskItem } from "@/components/ai-elements/task";
import { PromptInput } from "@/components/ai-elements/prompt-input";

export function shouldAutoScroll(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): boolean {
  return scrollHeight - scrollTop - clientHeight <= 60;
}

export default function GitWikiPage() {
  const [themeDark, setThemeDark] = React.useState(true);
  
  // Default Target Repository
  const [selectedRepo, setSelectedRepo] = React.useState("himanshubalani/album");
  const [repoInput, setRepoInput] = React.useState("https://github.com/himanshubalani/album");
  const [githubToken, setGithubToken] = React.useState("");
  
  const [isIndexing, setIsIndexing] = React.useState(false);
  const [isIndexed, setIsIndexed] = React.useState(false);
  const [activeSource, setActiveSource] = React.useState<SourceItem | null>(null);

  // Clean empty state on load
  const [messages, setMessages] = React.useState<any[]>([]);
  const [prompt, setPrompt] = React.useState("");
  const [isAnswering, setIsAnswering] = React.useState(false);

  // Auto-scroll references
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = React.useState(false);
  const prevMessageCountRef = React.useRef(messages.length);

  // Indexing DAG state
  const [tasks, setTasks] = React.useState<TaskItem[]>([
    { title: "Fetch Tree", detail: "Awaiting repository submission...", status: "pending" },
    { title: "Code Chunking", detail: "RecursiveCharacterTextSplitter (1000/150)", status: "pending" },
    { title: "Vector Embedding", detail: "Namespace ready for Pinecone upsert", status: "pending" },
  ]);

  const suggestions = [
    "How does it fetch images? and from where?",
    "Explain the component architecture and data flow",
    "Where are external API routes or endpoints configured?",
    "List all dependencies and environment variables needed",
  ];

  // Auto-scroll handler
  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = shouldAutoScroll(
      container.scrollTop,
      container.scrollHeight,
      container.clientHeight
    );
    setUserHasScrolledUp(!isNearBottom);
  }, []);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const messageCountChanged = messages.length !== prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (!userHasScrolledUp && (messageCountChanged || isAnswering)) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length, isAnswering, userHasScrolledUp]);

  // Toggle Dark/Light Mode
  const toggleTheme = () => {
    const next = !themeDark;
    setThemeDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Trigger Indexing Pipeline
  const handleStartIndexing = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!repoInput.trim()) return;

    setIsIndexing(true);
    setTasks([
      { title: "Fetch Tree", detail: "Traversing repo tree via GitHub Octokit...", status: "running" },
      { title: "Code Chunking", detail: "Queued for LangChain split", status: "pending" },
      { title: "Vector Embedding", detail: "Waiting for chunks...", status: "pending" },
    ]);

    try {
      const res = await fetch("/api/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoInput, githubToken: githubToken || undefined }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to trigger indexing");
      }

      setTimeout(() => {
        setTasks((prev) => [
          { ...prev[0], status: "completed" },
          { ...prev[1], status: "running", detail: "Splitting code into overlapping chunks..." },
          prev[2],
        ]);
      }, 1200);

      setTimeout(() => {
        setTasks((prev) => [
          prev[0],
          { ...prev[1], status: "completed" },
          { ...prev[2], status: "running", detail: "Upserting embeddings to Pinecone namespace..." },
        ]);
      }, 2500);

      setTimeout(() => {
        setTasks((prev) => [
          prev[0],
          prev[1],
          { ...prev[2], status: "completed", detail: "Index synced & ready for queries" },
        ]);
        const key = repoInput.replace(/https?:\/\/github\.com\//, "").replace(/\.git$/, "");
        setSelectedRepo(key);
        setIsIndexed(true);
        setIsIndexing(false);
      }, 3800);
    } catch (err: any) {
      setTasks([
        { title: "Pipeline Error", detail: err.message || "Indexing failed", status: "error" },
        { title: "Code Chunking", detail: "Cancelled", status: "pending" },
        { title: "Vector Embedding", detail: "Cancelled", status: "pending" },
      ]);
      setIsIndexing(false);
    }
  };

  // Submit Technical Question
  const handleSendPrompt = async (textToSend?: string) => {
    const questionText = (textToSend || prompt).trim();
    if (!questionText || isAnswering) return;

    setPrompt("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: questionText },
    ]);
    setIsAnswering(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: selectedRepo, question: questionText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Retrieval error");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer || "No grounded answer returned.",
          sources: data.sources || [],
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${err.message}. If this repository was not indexed yet, index it first.`,
          sources: [],
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground font-sans overflow-hidden">
      
      {/* Top Header Bar */}
      <header className="h-12 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary-subtle text-primary border border-primary/20 font-mono text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>GitWiki</span>
          </div>
          <span className="text-secondaryText font-mono text-xs">/</span>
          <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-none">
            {selectedRepo}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-full bg-elevated border border-border text-secondaryText">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isIndexed ? "bg-primary animate-pulse" : "bg-warning"
              }`}
            />
            {isIndexed ? "Ready" : "Not Indexed"}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setMessages([])}
            disabled={messages.length === 0 || isAnswering}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-secondaryText hover:text-error hover:border-error/40 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.97]"
            title="Clear Chat Transcript"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded border border-border hover:bg-elevated transition-colors text-secondaryText hover:text-foreground"
            title="Toggle theme"
          >
            {themeDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-primary" />}
          </button>
        </div>
      </header>

      {/* Two-Column Workbench Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        
        {/* Left Control Deck (4 columns) */}
        <aside className="lg:col-span-4 border-r border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* Target Repo Form */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-primary flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                Target Repository
              </span>
              <span className="font-mono text-[10px] text-secondaryText">HTTPS</span>
            </div>

            <form onSubmit={handleStartIndexing} className="space-y-3">
              <div>
                <label className="block font-mono text-[11px] text-secondaryText mb-1">
                  GITHUB_REPO_URL
                </label>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="w-full bg-card border border-border rounded px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="https://github.com/owner/repo"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-mono text-[11px] text-secondaryText">GITHUB_TOKEN</label>
                  <span className="font-mono text-[10px] text-secondaryText">OPTIONAL</span>
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full bg-card border border-border rounded px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="ghp_••••••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isIndexing || !repoInput.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs font-semibold py-2 px-3 rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {isIndexing ? (
                  <span className="animate-pulse">INDEXING TO PINECONE...</span>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>INDEX CODEBASE NOW</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Indexing Pipeline DAG */}
          <div className="border border-border rounded-lg bg-background p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/80 font-mono text-xs">
              <span className="font-bold uppercase tracking-wider text-secondaryText">Pipeline Tasks</span>
              <span className="text-[10px] text-primary">INNGEST_DAG</span>
            </div>
            <TaskProgress tasks={tasks} />
          </div>

          {/* Quick Metrics */}
          <div className="border border-border rounded-lg bg-background p-4 font-mono text-xs space-y-2 mt-auto">
            <div className="text-secondaryText font-bold uppercase tracking-wider text-[11px]">
              Retrieval Namespace
            </div>
            <div className="p-2 rounded bg-elevated border border-border flex items-center justify-between">
              <span className="text-secondaryText text-[11px]">Active Space:</span>
              <span className="font-semibold text-primary truncate">
                {selectedRepo.replace("/", "-")}
              </span>
            </div>
          </div>
        </aside>

        {/* Right Terminal Area (8 columns) */}
        <main className="lg:col-span-8 flex flex-col bg-background min-h-0 relative">
          
          {/* Subheader Status */}
          <div className="h-10 border-b border-border bg-card px-4 flex items-center justify-between font-mono text-xs shrink-0">
            <span className="text-secondaryText font-bold uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              Ask Your Codebase
            </span>
            <span className="text-[11px] text-secondaryText">
              Grounding: <strong className="text-foreground">STRICT</strong> (Retrieved AST Chunks)
            </span>
          </div>

          {/* Conversation & Clean Empty State */}
          <Conversation className="flex-1">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-4"
            >
              {messages.length === 0 ? (
                /* Workbench Empty State Dropzone */
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 select-none">
                  <div className="w-14 h-14 rounded-2xl border border-border bg-elevated flex items-center justify-center mb-4 text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                    <FolderGit2 className="w-7 h-7" />
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-foreground mb-1 font-mono tracking-tight">
                    Drop or paste a GitHub link to index now
                  </h2>
                  <p className="text-xs text-secondaryText max-w-md leading-relaxed mb-6">
                    Connect your repository to extract AST chunks, embed them into Pinecone, and query execution paths with zero hallucination.
                  </p>

                  {/* Target Repo Prompt Chip */}
                  <div className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-elevated border border-border text-xs font-mono text-secondaryText">
                    <span>Target:</span>
                    <strong className="text-foreground">{selectedRepo}</strong>
                    {!isIndexed && (
                      <button
                        onClick={() => handleStartIndexing()}
                        disabled={isIndexing}
                        className="ml-1 text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                      >
                        [Index Now <ArrowUpRight className="w-3 h-3 inline" />]
                      </button>
                    )}
                  </div>

                  {/* Suggestions Chips */}
                  <div className="w-full max-w-lg space-y-2">
                    <div className="text-[11px] font-mono text-secondaryText uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span>Suggested Queries</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {suggestions.map((chip, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSendPrompt(chip)}
                          className="p-2.5 rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-elevated transition-all text-xs font-sans text-secondaryText hover:text-foreground text-left active:scale-[0.98]"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Thread View */
                messages.map((m) => (
                  <Message key={m.id} role={m.role}>
                    <p>{m.content}</p>
                    {m.code && (
                      <CodeBlock
                        code={m.code}
                        filename={m.sources?.[0]?.path}
                        lines={m.sources?.[0]?.lines}
                      />
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <Sources
                        sources={m.sources}
                        onSelectSource={(source) => setActiveSource(source)}
                      />
                    )}
                  </Message>
                ))
              )}

              {isAnswering && (
                <div className="p-3 border border-border bg-card rounded-lg flex items-center gap-2.5 font-mono text-xs text-primary animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>Searching Pinecone vector store & synthesizing answer...</span>
                </div>
              )}
            </div>
          </Conversation>

          {/* Bottom Prompt Composer */}
          <div className="p-4 border-t border-border bg-card shrink-0">
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => handleSendPrompt()}
              disabled={isAnswering}
              placeholder={`Ask about ${selectedRepo} (e.g., how does it fetch images?)...`}
            />
          </div>

          {/* Source Attribution Drawer */}
          {activeSource && (
            <div className="absolute inset-y-0 right-0 w-full sm:w-96 border-l border-border bg-card shadow-2xl p-4 flex flex-col z-20 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{activeSource.path}</span>
                </div>
                <button
                  onClick={() => setActiveSource(null)}
                  className="p-1 rounded hover:bg-elevated text-secondaryText"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 flex-1 overflow-y-auto space-y-3 font-mono text-xs">
                <div className="text-[11px] text-secondaryText">
                  Segment: <strong className="text-primary">{activeSource.lines}</strong>
                </div>
                <div className="p-3 bg-[#111312] border border-border rounded text-[#E0E0DC] leading-relaxed text-[11px]">
                  <pre>{activeSource.snippet || "// Source chunk context from vector store."}</pre>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <button
                  onClick={() => setActiveSource(null)}
                  className="px-3 py-1 font-mono text-xs bg-elevated hover:bg-primary-subtle text-foreground rounded border border-border"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}