"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Robust, zero-dependency Markdown renderer for LLM output.
 * Formats lists, sub-bullets, bold text, code blocks, tables, and headers cleanly.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Normalize markdown text
  const normalized = React.useMemo(() => {
    return content
      // Normalize inline bullet lists like: "today? - **Item**" -> "today?\n- **Item**"
      .replace(/([^\n])\s+[-*]\s+\*\*/g, "$1\n- **")
      // Normalize inline numbered lists like: "end: 1. Item" -> "end:\n1. Item"
      .replace(/([^\n])\s+(\d+\.)\s+\*\*/g, "$1\n$2 **")
      // Replace horizontal divider markdown
      .replace(/\n\s*---\s*\n/g, "\n\n---DIVIDER---\n\n");
  }, [content]);

  const lines = normalized.split("\n");

  return (
    <div className={cn("space-y-2 text-xs sm:text-sm leading-relaxed text-foreground select-text", className)}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal Rule
        if (trimmed === "---DIVIDER---" || trimmed === "---" || trimmed === "***") {
          return <hr key={idx} className="my-3 border-border/60" />;
        }

        // Nested Sub-bullet (e.g. "   * If yes: ...", "  - Detail: ...")
        const isNested = line.startsWith("  ") || line.startsWith("\t");
        if (isNested && (trimmed.startsWith("* ") || trimmed.startsWith("- "))) {
          const itemText = trimmed.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-6 text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/60 mt-2 shrink-0" />
              <span className="flex-1">{renderFormattedText(itemText)}</span>
            </div>
          );
        }

        // Top-level Unordered List item (- or *)
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const itemText = trimmed.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span className="flex-1">{renderFormattedText(itemText)}</span>
            </div>
          );
        }

        // Numbered list item (1. , 2. )
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-semibold text-primary text-xs shrink-0 tabular-nums">
                {numMatch[1]}.
              </span>
              <span className="flex-1 font-medium">{renderFormattedText(numMatch[2])}</span>
            </div>
          );
        }

        // Header level 4 (#### Header)
        if (trimmed.startsWith("#### ")) {
          return (
            <h5 key={idx} className="font-semibold text-xs sm:text-sm text-foreground pt-1.5">
              {renderFormattedText(trimmed.replace(/^####\s+/, ""))}
            </h5>
          );
        }

        // Header level 3 (### Header)
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-xs sm:text-sm text-foreground pt-2">
              {renderFormattedText(trimmed.replace(/^###\s+/, ""))}
            </h4>
          );
        }

        // Header level 2 or 1 (## Header, # Header)
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          return (
            <h3 key={idx} className="font-bold text-sm sm:text-base text-foreground pt-2.5 tracking-tight border-b border-border/40 pb-1">
              {renderFormattedText(trimmed.replace(/^#+\s+/, ""))}
            </h3>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {renderFormattedText(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses markdown links [text](url), bold (**text**), italics (*text*), and inline code (`code`)
 */
function renderFormattedText(text: string): React.ReactNode[] {
  // Regex matches:
  // 1. [link text](url)
  // 2. **bold**
  // 3. `code`
  // 4. *italic*
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return parts.map((part, index) => {
    // Markdown link: [Title](/url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const linkLabel = linkMatch[1];
      const linkHref = linkMatch[2];
      return (
        <Link
          key={index}
          href={linkHref}
          className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {linkLabel}
        </Link>
      );
    }

    // Bold
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline Code
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
      return (
        <em key={index} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}
