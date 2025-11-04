import { useState, useEffect } from "react";
import { Type } from "lucide-react";
import type { ProjectType } from "@/shared/types";

interface EditorPanelProps {
  project: ProjectType;
  onTextUpdate: (text: string) => void;
}

export default function EditorPanel({ project, onTextUpdate }: EditorPanelProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(project.transcript_text || "");
  }, [project.transcript_text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onTextUpdate(newText);
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Editor de Texto</h3>
        </div>
        <div className="text-sm text-gray-400">
          {charCount.toLocaleString()} caracteres • {wordCount.toLocaleString()} palavras
        </div>
      </div>

      <textarea
        value={text}
        onChange={handleChange}
        placeholder="O texto transcrito aparecerá aqui. Você pode editá-lo livremente..."
        className="w-full h-[600px] bg-gray-800/50 border border-gray-700 text-white rounded-lg p-4 focus:outline-none focus:border-purple-500 transition-colors resize-none font-mono text-sm leading-relaxed"
        spellCheck={false}
      />

      {!text && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-600">
            <Type className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              Clique em "Gerar Transcrição" para começar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
