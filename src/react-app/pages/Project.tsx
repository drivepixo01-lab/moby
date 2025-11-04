import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, FileAudio, Loader2 } from "lucide-react";
import Header from "@/react-app/components/Header";
import { useAuth } from "@getmocha/users-service/react";
import type { ProjectType, DiagnosticInfo } from "@/shared/types";
import TranscriptionPanel from "@/react-app/components/TranscriptionPanel";
import EditorPanel from "@/react-app/components/EditorPanel";
import DiagnosticPanel from "@/react-app/components/DiagnosticPanel";

export default function Project() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [project, setProject] = useState<ProjectType | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchDiagnostic();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        setError("Projeto não encontrado");
      }
    } catch (err) {
      setError("Erro ao carregar projeto");
    } finally {
      setLoading(false);
    }
  };

  const fetchDiagnostic = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/diagnostic`);
      if (response.ok) {
        const data = await response.json();
        setDiagnostic(data);
      }
    } catch (err) {
      console.error("Error fetching diagnostic:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleTranscriptionComplete = (text: string, transcriptId?: string, provider?: string) => {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            transcript_text: text,
            transcript_id: transcriptId || null,
            provider_used: (provider as any) || prev.provider_used,
          }
        : null
    );
    fetchDiagnostic();
  };

  const handleTextUpdate = (text: string) => {
    setProject((prev) => (prev ? { ...prev, transcript_text: text } : null));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
        <Header onLogout={handleLogout} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
        <Header onLogout={handleLogout} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-12 text-center">
            <FileAudio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">{error}</h3>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      <Header onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{project.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="capitalize">{project.source_type === "upload" ? "Upload" : "URL"}</span>
            {project.file_name && (
              <>
                <span>•</span>
                <span>{project.file_name}</span>
              </>
            )}
            {project.provider_used && project.provider_used !== "failed" && (
              <>
                <span>•</span>
                <span className="text-green-400">{project.provider_used}</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <TranscriptionPanel
              project={project}
              onTranscriptionComplete={handleTranscriptionComplete}
            />
            {diagnostic && <DiagnosticPanel diagnostic={diagnostic} />}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2">
            <EditorPanel
              project={project}
              onTextUpdate={handleTextUpdate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
