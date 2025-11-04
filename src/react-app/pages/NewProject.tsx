import { useState } from "react";
import { useNavigate } from "react-router";
import { Upload, Link as LinkIcon, ArrowLeft, AlertCircle } from "lucide-react";
import Header from "@/react-app/components/Header";
import { useAuth } from "@getmocha/users-service/react";

type SourceType = "upload" | "url";

export default function NewProject() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sourceType, setSourceType] = useState<SourceType>("upload");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validExtensions = ["flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"];
  const maxFileSize = 50 * 1024 * 1024; // 50 MB

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    
    if (!extension || !validExtensions.includes(extension)) {
      setError(`Formato inválido. Use: ${validExtensions.join(", ")}`);
      return;
    }

    if (selectedFile.size > maxFileSize) {
      setError("Arquivo muito grande (máx. 50 MB)");
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setError("");
    
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }

    if (sourceType === "upload" && !file) {
      setError("Selecione um arquivo");
      return;
    }

    if (sourceType === "url" && !url.trim()) {
      setError("URL é obrigatória");
      return;
    }

    if (sourceType === "url" && !url.startsWith("https://")) {
      setError("URL deve começar com https://");
      return;
    }

    setLoading(true);

    try {
      // Create project
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          source_type: sourceType,
          source_url: sourceType === "url" ? url : undefined,
        }),
      });

      if (!projectResponse.ok) {
        throw new Error("Erro ao criar projeto");
      }

      const project = await projectResponse.json();

      // Upload file if source is upload
      if (sourceType === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(`/api/projects/${project.id}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Erro ao enviar arquivo");
        }
      }

      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950">
      <Header onLogout={handleLogout} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Novo Projeto</h1>
          <p className="text-gray-400 mb-8">
            Faça upload de um arquivo ou use um link direto
          </p>

          {/* Source Type Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSourceType("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                sourceType === "upload"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-750"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setSourceType("url")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                sourceType === "url"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-750"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              Link/URL
            </button>
          </div>

          {/* Title Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Título do Projeto
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Podcast Episódio 1"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Upload Section */}
          {sourceType === "upload" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Arquivo de Áudio/Vídeo
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragActive
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileInput}
                  accept={validExtensions.map((ext) => `.${ext}`).join(",")}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <div className="bg-purple-500/10 p-3 rounded-lg inline-block">
                      <Upload className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Remover arquivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-gray-800 p-3 rounded-lg inline-block">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-white font-medium">
                      Arraste um arquivo ou clique para selecionar
                    </p>
                    <p className="text-gray-400 text-sm">
                      Formatos: {validExtensions.join(", ")} (máx. 50 MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL Section */}
          {sourceType === "url" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link Direto do Arquivo
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/meu-arquivo.mp3"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <div className="mt-2 flex items-start gap-2 text-sm text-yellow-400/80">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Links de TikTok/YouTube não funcionam diretamente. Baixe o arquivo ou use upload.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {loading ? "Criando projeto..." : "Criar Projeto"}
          </button>
        </div>
      </main>
    </div>
  );
}
