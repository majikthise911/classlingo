"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidBlockProps {
  chart: string;
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (e) {
        setError(`Mermaid error: ${e instanceof Error ? e.message : e}`);
      }
    }
    render();
  }, [chart]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm text-muted-foreground">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return <div className="flex items-center justify-center py-4 text-muted-foreground">Loading diagram...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="mermaid my-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
