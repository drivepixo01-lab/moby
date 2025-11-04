import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, FileAudio, Link as LinkIcon, Calendar } from "lucide-react";
import { useAuth } from "@getmocha/users-service/react";
import type { ProjectType } from "@/shared/types";
import Header from "@/react-app/components/Header";

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      <Header onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Meus Projetos</h1>
            <p className="text-gray-400">Gerencie suas transcrições e narrações</p>
          </div>
          <button
            onClick={() => navigate("/projects/new")}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
          >
            <Plus className="w-5 h-5" />
            Novo Projeto
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-purple-400">Carregando projetos...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-12 max-w-md mx-auto">
              <FileAudio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto ainda</h3>
              <p className="text-gray-400 mb-6">
                Crie seu primeiro projeto para começar a transcrever
              </p>
              <button
                onClick={() => navigate("/projects/new")}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Criar Projeto
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-3 rounded-lg ${
                      project.source_type === "upload"
                        ? "bg-purple-500/10"
                        : "bg-pink-500/10"
                    }`}
                  >
                    {project.source_type === "upload" ? (
                      <FileAudio className="w-6 h-6 text-purple-400" />
                    ) : (
                      <LinkIcon className="w-6 h-6 text-pink-400" />
                    )}
                  </div>
                  {project.provider_used && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.provider_used === "assemblyai"
                          ? "bg-green-500/10 text-green-400"
                          : project.provider_used === "failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {project.provider_used}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  {project.title}
                </h3>

                {project.file_name && (
                  <p className="text-sm text-gray-400 mb-2 truncate">{project.file_name}</p>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(project.created_at)}
                </div>

                {project.transcript_text && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {project.transcript_text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
