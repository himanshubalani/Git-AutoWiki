import * as React from "react";
import { cn } from "@/lib/utils";

export function Conversation({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function ConversationContent({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-4 md:p-6 space-y-6", className)}>
      {children}
    </div>
  );
}