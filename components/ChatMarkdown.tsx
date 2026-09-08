"use client";

import { useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { normalizeMarkdownMath } from "@/lib/markdown-math";

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (node && typeof node === "object" && "props" in node) {
    const element = node as { props?: { children?: ReactNode } };
    return textFromNode(element.props?.children);
  }
  return "";
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = textFromNode(children).replace(/\n$/, "");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative my-3 max-w-full">
      <button
        type="button"
        onClick={() => void copyCode()}
        className="absolute right-2 top-2 z-10 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Copy code to clipboard"
      >
        {copied ? "Copied" : "Copy code"}
      </button>
      <pre className="max-w-full overflow-x-auto rounded-lg bg-[#17131C] p-4 pr-24 text-[13px] leading-6 text-gray-100">
        {children}
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  a({ href, children }) {
    if (!href) return <span>{children}</span>;
    const isExternal = /^https?:\/\//i.test(href ?? "");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
      >
        {children}
        {isExternal ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    );
  },
  img({ alt }) {
    return (
      <span className="inline-flex rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600" role="note">
        {alt ? `Image not loaded: ${alt}` : "External image not loaded"}
      </span>
    );
  },
  table({ children }) {
    return (
      <div
        className="my-3 max-w-full overflow-x-auto rounded-lg border border-gray-300 bg-white"
        role="region"
        aria-label="Scrollable table"
        tabIndex={0}
      >
        <table className="w-full min-w-max border-collapse">{children}</table>
      </div>
    );
  },
  pre({ children }) {
    return <CodeBlock>{children}</CodeBlock>;
  },
  h1({ children }) {
    return <h1 className="mb-2 mt-4 text-xl font-bold leading-tight">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-4 text-lg font-bold leading-tight">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mb-1.5 mt-3 text-base font-bold leading-tight">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="mb-1 mt-3 text-sm font-bold">{children}</h4>;
  },
  h5({ children }) {
    return <h5 className="mb-1 mt-3 text-sm font-bold">{children}</h5>;
  },
  h6({ children }) {
    return <h6 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide">{children}</h6>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-3 border-l-4 border-[#C4A0D6] bg-white/60 py-2 pl-3 pr-2 text-gray-700">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-4 border-gray-300" />;
  },
};

export default function ChatMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="chat-markdown max-w-none break-words text-left [&_.katex-display]:my-3 [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.task-list-item]:list-none [&_.task-list-item]:pl-0 [&_a]:font-medium [&_a]:text-primary-700 [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_del]:text-gray-500 [&_li]:my-1 [&_li]:pl-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_tbody_tr:nth-child(even)]:bg-gray-50 [&_td]:border-t [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_th]:bg-[#F7F0FA] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSanitize,
          [rehypeKatex, { strict: false, throwOnError: false, errorColor: "#B42318" }],
          [rehypeHighlight, { detect: false, plainText: ["mermaid"] }],
        ]}
        components={markdownComponents}
      >
        {normalizeMarkdownMath(markdown)}
      </ReactMarkdown>
    </div>
  );
}
