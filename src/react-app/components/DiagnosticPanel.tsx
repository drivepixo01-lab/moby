import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { DiagnosticInfo } from "@/shared/types";

interface DiagnosticPanelProps {
  diagnostic: DiagnosticInfo;
}

export default function DiagnosticPanel({ diagnostic }: DiagnosticPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const secretsList = [
    { key: "assemblyai", label: "AssemblyAI", status: diagnostic.secrets_status.assemblyai },
    { key: "openai", label: "OpenAI", status: diagnostic.secrets_status.openai },
    { key: "elevenlabs", label: "ElevenLabs", status: diagnostic.secrets_status.elevenlabs },
    { key: "deepgram", label: "Deepgram", status: diagnostic.secrets_status.deepgram },
  ];

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Painel de Diagnóstico</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Provider Used */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Provider Usado</p>
            <p className="text-sm text-white">
              {diagnostic.provider_used || "Nenhum"}
            </p>
          </div>

          {/* Secrets Status */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Status das Chaves</p>
            <div className="space-y-2">
              {secretsList.map((secret) => (
                <div key={secret.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{secret.label}</span>
                  {secret.status ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* File Info */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Informações do Arquivo</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>
                <span className="text-gray-500">Origem:</span>{" "}
                {diagnostic.file_info.source === "upload" ? "Upload" : "URL"}
              </p>
              {diagnostic.file_info.size && (
                <p>
                  <span className="text-gray-500">Tamanho:</span>{" "}
                  {(diagnostic.file_info.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
              {diagnostic.file_info.mime && (
                <p>
                  <span className="text-gray-500">Tipo:</span>{" "}
                  {diagnostic.file_info.mime}
                </p>
              )}
            </div>
          </div>

          {/* Last Error */}
          {diagnostic.last_error && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Último Erro</p>
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-sm text-red-400">{diagnostic.last_error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
