"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Terminal, User, Copy, Check } from "lucide-react";
import { CodeBlock } from "@/components/ai-elements/code-block";

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "user" | "assistant" | "system";
  content?: string;
}

/** Recursively extracts plain text from strings, arrays, or JSX children like <p>{text}</p> */
function extractText(children: React.ReactNode): string | null {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    const combined = children.map(extractText).filter(Boolean).join("");
    return combined.length > 0 ? combined : null;
  }
  if (React.isValidElement(children) && (children.props as any)?.children) {
    return extractText((children.props as any).children);
  }
  return null;
}

/** Parses inline markdown: code, bold, italic, links, and auto-links */
function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let keyCounter = 0;
  const inlineRegex =
    /(`[^`]+`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Inline `code`
      tokens.push(
        <code
          key={`code-${keyCounter++}`}
          className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-primary"
        >
          {match[1].slice(1, -1)}
        </code>
      );
    } else if (match[2]) {
      // **bold**
      tokens.push(
        <strong key={`bold-${keyCounter++}`} className="font-semibold text-foreground">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      // *italic*
      tokens.push(
        <em key={`italic-${keyCounter++}`} className="italic text-foreground/90">
          {match[5]}
        </em>
      );
    } else if (match[6]) {
      // [text](url)
      tokens.push(
        <a
          key={`link-${keyCounter++}`}
          href={match[8]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity font-mono text-xs"
        >
          {match[7]}
        </a>
      );
    } else if (match[9]) {
      // auto url
      tokens.push(
        <a
          key={`url-${keyCounter++}`}
          href={match[9]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline decoration-1 underline-offset-2 hover:opacity-80 transition-opacity break-all font-mono text-xs"
        >
          {match[9]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

/** Full block-level markdown renderer */
export function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let keyCounter = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced Code Blocks: ```typescript ... ```
    if (line.trim().startsWith("```")) {
      const match = line.trim().match(/^```(\w+)?/);
      const language = match?.[1] || "typescript";
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      elements.push(
        <CodeBlock
          key={`fenced-code-${keyCounter++}`}
          code={codeLines.join("\n")}
          language={language}
        />
      );
      continue;
    }

    // 2. Headings: #, ##, ###
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = ({
        1: "h1",
        2: "h2",
        3: "h3",
        4: "h4",
        5: "h5",
        6: "h6",
      }[level] || "h3") as React.ElementType;

      const headingClasses = {
        1: "mt-4 mb-2 text-base font-bold font-mono text-foreground border-b border-border pb-1",
        2: "mt-3 mb-1.5 text-sm font-bold font-mono text-foreground",
        3: "mt-2.5 mb-1 text-xs font-bold font-mono text-primary uppercase tracking-wider",
        4: "mt-2 mb-1 text-xs font-semibold text-foreground",
        5: "mt-2 mb-1 text-xs font-semibold text-secondaryText",
        6: "mt-2 mb-1 text-xs font-semibold text-secondaryText",
      } as const;

      elements.push(
        <Tag
          key={`heading-${keyCounter++}`}
          className={headingClasses[level as keyof typeof headingClasses]}
        >
          {renderInline(headingMatch[2])}
        </Tag>
      );
      i++;
      continue;
    }

    // 3. Blockquotes: > Quote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${keyCounter++}`}
          className="border-l-2 border-primary/70 bg-elevated/40 pl-3 py-1 my-2 text-xs italic text-secondaryText rounded-r"
        >
          {quoteLines.map((q, idx) => (
            <p key={idx}>{renderInline(q)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 4. Horizontal Rules: --- or ***
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      elements.push(<hr key={`hr-${keyCounter++}`} className="my-3 border-border" />);
      i++;
      continue;
    }

    // 5. Unordered Lists: - item or * item
    if (/^[-*]\s+(.*)$/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+(.*)$/.test(lines[i])) {
        const itemMatch = /^[-*]\s+(.*)$/.exec(lines[i]);
        if (itemMatch) {
          listItems.push(
            <li key={`li-${keyCounter++}`} className="text-foreground leading-relaxed">
              {renderInline(itemMatch[1])}
            </li>
          );
        }
        i++;
      }
      elements.push(
        <ul key={`ul-${keyCounter++}`} className="list-disc pl-5 space-y-1 my-2 text-xs">
          {listItems}
        </ul>
      );
      continue;
    }

    // 6. Ordered Lists: 1. item
    if (/^\d+\.\s+(.*)$/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+(.*)$/.test(lines[i])) {
        const itemMatch = /^\d+\.\s+(.*)$/.exec(lines[i]);
        if (itemMatch) {
          listItems.push(
            <li key={`oli-${keyCounter++}`} className="text-foreground leading-relaxed">
              {renderInline(itemMatch[1])}
            </li>
          );
        }
        i++;
      }
      elements.push(
        <ol key={`ol-${keyCounter++}`} className="list-decimal pl-5 space-y-1 my-2 text-xs">
          {listItems}
        </ol>
      );
      continue;
    }

    // 7. Empty line spacing
    if (!line.trim()) {
      elements.push(<div key={`spacer-${keyCounter++}`} className="h-1.5" />);
      i++;
      continue;
    }

    // 8. Normal Paragraph
    elements.push(
      <p key={`p-${keyCounter++}`} className="leading-relaxed text-foreground text-xs my-1">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

/** Markdown response wrapper (Vercel AI Elements pattern) */
export function MessageResponse({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const rawText = extractText(children);
  return (
    <div className={cn("space-y-1 text-xs", className)}>
      {rawText ? renderMarkdown(rawText) : children}
    </div>
  );
}

/** Message bubble container */
export function Message({ role, children, content, className, ...props }: MessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = React.useState(false);

  // Determine text to render (either from content prop or extracted from children)
  const textContent = content || extractText(children);

  // If children has other structured components (e.g., <Sources />, <CodeBlock />), preserve them
  const childArray = React.Children.toArray(children);
  const nonTextChildren = childArray.filter(
    (c) => typeof c !== "string" && (!React.isValidElement(c) || c.type !== "p")
  );

  const handleCopy = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4 transition-all text-xs",
        isUser
          ? "ml-8 md:ml-16 bg-elevated border-border"
          : "mr-4 md:mr-12 bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className
      )}
      {...props}
    >
      {/* Sender Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          {isUser ? (
            <>
              <User className="w-3.5 h-3.5 text-secondaryText" />
              <span className="font-semibold text-foreground uppercase tracking-wider">
                Operator
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-primary uppercase tracking-wider">
                GitWiki AI
              </span>
            </>
          )}
        </div>

        {/* Copy Message Action */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-secondaryText hover:text-foreground transition-colors"
          title="Copy response text"
        >
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "COPIED" : "COPY"}</span>
        </button>
      </div>

      {/* Rendered Markdown Body */}
      <div className="font-sans leading-relaxed text-foreground">
        {textContent ? renderMarkdown(textContent) : children}
      </div>

      {/* Render embedded elements like Sources */}
      {nonTextChildren.length > 0 && <div className="space-y-2 mt-2">{nonTextChildren}</div>}
    </div>
  );
}