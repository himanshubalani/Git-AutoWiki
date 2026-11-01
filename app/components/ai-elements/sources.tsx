import * as React from "react";
import { cn } from "@/lib/utils";
import { FileCode, ChevronRight } from "lucide-react";

export interface SourceItem {
  path: string;
  lines: string;
  snippet?: string;
}

interface SourcesProps {
  sources: SourceItem[];
  onSelectSource?: (source: SourceItem) => void;
  className?: string;
}

export function Sources({ sources, onSelectSource, className }: SourcesProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={cn("mt-4 pt-3 border-t border-border/60", className)}>
      <div className="text-[11px] font-mono uppercase tracking-wider text-secondaryText mb-2 flex items-center justify-between">
        <span>Grounded Sources ({sources.length})</span>
        <span>Vector Match k=5</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {sources.map((src, i) => (
          <button
            key={i}
            onClick={() => onSelectSource?.(src)}
            className="flex items-center justify-between p-2 rounded-md bg-elevated hover:bg-primary-subtle/50 border border-border hover:border-primary/50 text-left transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileCode className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="truncate">
                <p className="text-xs font-mono font-medium text-foreground truncate">
                  {src.path}
                </p>
                <p className="text-[10px] font-mono text-secondaryText">
                  Relevant source · {src.lines}
                </p>
              </div>
            </div>
            <ChevronRight className="w-3 h-3 text-secondaryText group-hover:text-primary shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  );
}