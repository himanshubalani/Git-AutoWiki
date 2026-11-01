import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type TaskStatus = "pending" | "running" | "completed" | "error";

export interface TaskItem {
  title: string;
  detail: string;
  status: TaskStatus;
}

interface TaskProgressProps {
  tasks: TaskItem[];
  className?: string;
}

export function TaskProgress({ tasks, className }: TaskProgressProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {tasks.map((task, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3 p-2.5 rounded-md border border-border bg-elevated text-xs font-mono"
        >
          <div className="mt-0.5">
            {task.status === "completed" && (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            )}
            {task.status === "running" && (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            )}
            {task.status === "pending" && (
              <Circle className="w-3.5 h-3.5 text-secondaryText" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground">{task.title}</div>
            <div className="text-[11px] text-secondaryText truncate">{task.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}