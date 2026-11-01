import * as React from "react";
import { cn } from "@/lib/utils";
import { Terminal, User } from "lucide-react";

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "user" | "assistant" | "system";
}

export function Message({ role, children, className }: MessageProps) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4 transition-all text-sm",
        isUser
          ? "ml-8 md:ml-16 bg-elevated border-border"
          : "mr-4 md:mr-12 bg-card border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2 text-xs font-mono">
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
      </div>
      <div className="font-sans leading-relaxed text-foreground">{children}</div>
    </div>
  );
}