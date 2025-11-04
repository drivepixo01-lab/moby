import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Mic, FileAudio, Languages } from "lucide-react";

export default function Login() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-purple-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM4YjVjZjYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItMnptMC0ydjJoLTJ2LTJ6bTItMnYyaC0ydi0yem0wLTJ2MmgtMnYtMnptMCAyaDJ2Mmgtdi0yem0yIDB2Mmgydi0yem0wLTJ2Mmgydi0yem0yIDBoMnYyaC0ydi0yem0wIDJ2Mmgydi0yem0wIDJoLTJ2Mmgydi0yem0tMiAwaC0ydjJoMnYtMnptLTIgMGgtMnYyaDJ2LTJ6bS0yLTJoLTJ2Mmgydi0yem0wLTJoLTJ2Mmgydi0yem0yIDB2LTJoLTJ2MnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
      
      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-50"></div>
              <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-2xl">
                <Mic className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
            MOBY TRANSCRIPT
          </h1>
          <p className="text-gray-400 text-lg">
            Transcreva e narre áudios e vídeos com IA
          </p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <FileAudio className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Upload ou URL</h3>
                <p className="text-gray-400 text-sm">
                  Envie arquivos ou links diretos de áudio/vídeo
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-pink-500/10 p-3 rounded-xl">
                <Languages className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Transcrição Automática</h3>
                <p className="text-gray-400 text-sm">
                  IA de ponta para transcrições precisas em português
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <Mic className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Síntese de Voz</h3>
                <p className="text-gray-400 text-sm">
                  Converta texto em áudio natural com vozes brasileiras
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={redirectToLogin}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Acesso seguro com sua conta Google
        </p>
      </div>
    </div>
  );
}
