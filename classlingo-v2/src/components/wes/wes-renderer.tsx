"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import { MermaidBlock } from "./mermaid-block";

interface WesRendererProps {
  content: string;
}

export function WesRenderer({ content }: WesRendererProps) {
  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1];
      const codeString = String(children).replace(/\n$/, "");

      if (lang === "mermaid") {
        return <MermaidBlock chart={codeString} />;
      }

      if (lang === "exercise") {
        // Render exercise blocks as styled JSON
        return (
          <div className="my-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-primary">Exercise</p>
            <pre className="overflow-x-auto text-sm">
              <code>{codeString}</code>
            </pre>
          </div>
        );
      }

      // Inline code
      if (!lang) {
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm" {...props}>
            {children}
          </code>
        );
      }

      // Block code
      return (
        <pre className="overflow-x-auto rounded-lg bg-muted p-4">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="bg-muted px-3 py-2 text-left font-semibold">{children}</th>
      );
    },
    td({ children }) {
      return <td className="border-t px-3 py-2">{children}</td>;
    },
    details({ children }) {
      return <details className="my-2 rounded-md border p-3">{children}</details>;
    },
    summary({ children }) {
      return <summary className="cursor-pointer font-semibold">{children}</summary>;
    },
    h1({ children }) {
      return <h1 className="mb-4 mt-8 text-2xl font-bold">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="mb-3 mt-6 text-xl font-bold">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>;
    },
    h4({ children }) {
      return <h4 className="mb-2 mt-3 text-base font-semibold">{children}</h4>;
    },
    p({ children }) {
      return <p className="mb-3 leading-relaxed">{children}</p>;
    },
    ul({ children }) {
      return <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="my-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
          {children}
        </blockquote>
      );
    },
    hr() {
      return <hr className="my-6 border-border" />;
    },
  };

  return (
    <div className="prose-custom">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
