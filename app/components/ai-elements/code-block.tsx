import * as React from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  lines?: string;
}

export function CodeBlock({ code, language = "typescript", filename, lines }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-md border border-border bg-[#111312] text-[#E0E0DC] overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#252C28] bg-[#171A19]">
        <div className="flex items-center gap-2 text-secondaryText">
          <span className="text-primary font-semibold">{filename || language}</span>
          {lines && <span>({lines})</span>}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Copy snippet"
        >
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
          <span className="text-[10px]">{copied ? "COPIED" : "COPY"}</span>
        </button>
      </div>
      <div className="p-3 overflow-x-auto leading-relaxed">
        <pre>{code}</pre>
      </div>
    </div>
  );
}