import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { normalizeMarkdownForRendering } from "@/utils/markdownUtils";

interface CoodaraMarkdownProps {
  content: string;
  className?: string;
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = String(children || "").replace(/\n$/, "");
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2.5 overflow-hidden rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] shadow-xs">
      <div className="flex items-center justify-between border-b border-[var(--cd-border-soft)] bg-[var(--cd-surface)] px-3 py-1.5 text-[11px] text-[var(--cd-ink-faint)]">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--cd-ink-soft)]">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] transition-colors"
          title="Copy code"
          type="button"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[var(--cd-good)]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-[var(--cd-ink)]">
        <pre className="!m-0 !p-0 font-mono">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

export function CoodaraMarkdown({ content, className = "" }: CoodaraMarkdownProps) {
  const normalized = normalizeMarkdownForRendering(content);

  return (
    <div className={`coodara-markdown text-[13px] leading-relaxed text-[var(--cd-ink)] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-[16px] font-bold text-[var(--cd-ink)] tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3.5 mb-1.5 text-[14.5px] font-bold text-[var(--cd-ink)] border-b border-[var(--cd-border-soft)] pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1 text-[13.5px] font-bold text-[var(--cd-accent)] flex items-center gap-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-2.5 mb-1 text-[12.5px] font-semibold text-[var(--cd-ink)]">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-1.5 text-[13px] leading-relaxed text-[var(--cd-ink)]">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--cd-ink)]">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[var(--cd-ink-soft)]">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 list-disc pl-5 text-[13px] text-[var(--cd-ink)] marker:text-[var(--cd-accent)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 list-decimal pl-5 text-[13px] text-[var(--cd-ink)] marker:text-[var(--cd-accent)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 rounded-r-lg border-l-3 border-[var(--cd-accent)] bg-[var(--cd-accent-soft)]/20 px-3.5 py-2 text-[12.5px] italic text-[var(--cd-ink-soft)]">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isMultiline = String(children).includes("\n");
            if (isMultiline) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }
            return (
              <code
                className="rounded border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-[var(--cd-accent)]"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-[var(--cd-border-soft)]">
              <table className="w-full border-collapse text-left text-[12px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-[var(--cd-border)] bg-[var(--cd-sunken)] text-[11.5px] font-semibold uppercase tracking-wider text-[var(--cd-ink-soft)]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[var(--cd-border-soft)] bg-[var(--cd-surface)]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[var(--cd-sunken)]/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-[var(--cd-ink)]">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--cd-accent)] underline decoration-[var(--cd-accent-soft)] underline-offset-2 hover:decoration-[var(--cd-accent)]"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-3 border-[var(--cd-border-soft)]" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
