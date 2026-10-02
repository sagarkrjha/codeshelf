import { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Load common language grammars
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';

interface CodeViewerProps {
  code: string;
  language: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'jsx',
  py: 'python',
  python: 'python',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  rs: 'rust',
  rust: 'rust',
  go: 'go',
  golang: 'go',
  java: 'java',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
};


export function CodeViewer({ code, language }: CodeViewerProps) {
  const codeRef = useRef<HTMLElement>(null);
  const normalizedLang = LANGUAGE_MAP[language.toLowerCase()] || 'javascript';

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, normalizedLang]);

  return (
    <pre className="font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto m-0 py-3 px-4">
      <code ref={codeRef} className={`language-${normalizedLang}`}>
        {code}
      </code>
    </pre>
  );
}
