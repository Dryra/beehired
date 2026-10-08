import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { sql } from "@codemirror/lang-sql";
import { cpp } from "@codemirror/lang-cpp";
import type { CodeLanguage } from "../interviewTypes";

export default function InterviewCodeEditor({
  value,
  language,
  disabled,
  onChange,
}: {
  value: string;
  language: CodeLanguage;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const extensions = useMemo(() => {
    switch (language) {
      case "javascript":
        return [javascript({ jsx: true })];
      case "typescript":
        return [javascript({ typescript: true, jsx: true })];
      case "python":
        return [python()];
      case "java":
        return [java()];
      case "sql":
        return [sql()];
      case "cpp":
        return [cpp()];
      default:
        return [];
    }
  }, [language]);
  return (
    <CodeMirror
      value={value}
      height="320px"
      theme="dark"
      extensions={extensions}
      editable={!disabled}
      onChange={onChange}
      indentWithTab={false}
      basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
      aria-label="Your code answer"
    />
  );
}
