import * as React from "react";
import { ArrowUp } from "lucide-react";

interface PromptInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative rounded-lg border border-border bg-card p-2 focus-within:ring-2 focus-within:ring-primary/40 transition-all">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Ask your codebase a technical question..."}
        rows={2}
        className="w-full resize-none bg-transparent text-sm font-sans text-foreground placeholder:text-secondaryText focus:outline-none"
      />
      <div className="flex items-center justify-between pt-1 border-t border-border/50 font-mono text-[11px] text-secondaryText">
        <span>Shift + Enter for newline</span>
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="flex items-center gap-1 rounded bg-primary px-3 py-1 text-primary-foreground font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <span>INQUIRE</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}