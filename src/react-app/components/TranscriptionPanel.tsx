import { useState } from "react";
import { Mic, Download, Volume2, Loader2, AlertCircle } from "lucide-react";
import type { ProjectType } from "@/shared/types";

interface TranscriptionPanelProps {
  project: ProjectType;
  onTranscriptionComplete: (text: string, transcriptId?: string, provider?: string) => void;
}

const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Feminina)" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Feminina)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Feminina)" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Masculina)" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Feminina)" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Masculina)" },
];

export default function TranscriptionPanel({
  project,
  onTranscriptionComplete,
}: TranscriptionPanelProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(ELEVENLABS_VOICES[0].id);
  const [testingUpload, setTestingUpload] = useState(false);
  const [testingUrl, setTestingUrl] = useState(false);

  const handleTranscribe = async () => {
    setTranscribing(true);
    setTranscriptionError("");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na transcrição");
      }

      const data = await response.json();
      onTranscriptionComplete(data.text, data.transcript_id, data.provider_used);
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setTranscribing(false);
    }
  };

  const handleExportSubtitles = async (format: "srt" | "vtt") => {
    const params = new URLSearchParams({
      project_id: project.id.toString(),
    });

    if (project.transcript_id) {
      params.append("transcript_id", project.transcript_id);
    }

    try {
      const response = await fetch(`/api/subtitles/${format}?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `legendas.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Error downloading subtitles:", err);
    }
  };

  const handleGenerateAudio = async () => {
    if (!project.transcript_text) {
      setAudioError("Nenhum texto disponível para narração");
      return;
    }

    setGeneratingAudio(true);
    setAudioError("");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: project.transcript_text,
          voice_id: selectedVoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar narração");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "narracao.mp3";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setGeneratingAudio(false);
    }
  };

  const handleTestUpload = async () => {
    setTestingUpload(true);
    setTranscriptionError("");

    try {
      // Create a simple audio blob for testing
      const audioContext = new AudioContext();
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / audioContext.sampleRate) * 0.1;
      }

      // Convert to WAV
      const wav = audioBufferToWav(buffer);
      const blob = new Blob([wav], { type: "audio/wav" });
      const file = new File([blob], "test.wav", { type: "audio/wav" });

      // Upload
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`/api/projects/${project.id}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Erro ao enviar arquivo de teste");
      }

      // Transcribe
      await handleTranscribe();
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : "Erro no teste");
    } finally {
      setTestingUpload(false);
    }
  };

  const handleTestUrl = async () => {
    setTestingUrl(true);
    setTranscriptionError("");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na transcrição");
      }

      const data = await response.json();
      onTranscriptionComplete(data.text, data.transcript_id, data.provider_used);
    } catch (err) {
      setTranscriptionError(err instanceof Error ? err.message : "Erro no teste");
    } finally {
      setTestingUrl(false);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 space-y-6">
      {/* Media Info */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Informações</h3>
        {project.file_name && (
          <div className="text-sm text-gray-400 space-y-1">
            <p>
              <span className="text-gray-500">Arquivo:</span> {project.file_name}
            </p>
            {project.file_size && (
              <p>
                <span className="text-gray-500">Tamanho:</span>{" "}
                {(project.file_size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>
        )}
        {project.source_url && (
          <div className="text-sm text-gray-400">
            <p className="text-gray-500 mb-1">URL:</p>
            <p className="break-all">{project.source_url}</p>
          </div>
        )}
      </div>

      {/* Transcription */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Transcrição</h3>
        <button
          onClick={handleTranscribe}
          disabled={transcribing}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {transcribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcrevendo...
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Gerar Transcrição
            </>
          )}
        </button>

        {transcriptionError && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{transcriptionError}</p>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleExportSubtitles("srt")}
            className="flex-1 bg-gray-800 hover:bg-gray-750 text-gray-300 text-sm font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            SRT
          </button>
          <button
            onClick={() => handleExportSubtitles("vtt")}
            className="flex-1 bg-gray-800 hover:bg-gray-750 text-gray-300 text-sm font-medium py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            VTT
          </button>
        </div>
      </div>

      {/* Text-to-Speech */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Síntese de Voz</h3>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-purple-500 transition-colors text-sm"
        >
          {ELEVENLABS_VOICES.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerateAudio}
          disabled={generatingAudio || !project.transcript_text}
          className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {generatingAudio ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              Gerar Narração
            </>
          )}
        </button>

        {audioError && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{audioError}</p>
          </div>
        )}
      </div>

      {/* Quick Tests */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Testes Rápidos</h3>
        <div className="space-y-2">
          <button
            onClick={handleTestUpload}
            disabled={testingUpload}
            className="w-full bg-gray-800 hover:bg-gray-750 disabled:bg-gray-700 text-gray-300 text-sm font-medium py-2 px-3 rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {testingUpload ? "Testando..." : "Testar upload simulado"}
          </button>
          <button
            onClick={handleTestUrl}
            disabled={testingUrl}
            className="w-full bg-gray-800 hover:bg-gray-750 disabled:bg-gray-700 text-gray-300 text-sm font-medium py-2 px-3 rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {testingUrl ? "Testando..." : "Testar URL direta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert AudioBuffer to WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
  setUint16(buffer.numberOfChannels * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return arrayBuffer;
}
