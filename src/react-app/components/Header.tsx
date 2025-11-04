import { Mic, LogOut } from "lucide-react";
import { useAuth } from "@getmocha/users-service/react";

interface HeaderProps {
  onLogout: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30"></div>
              <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              MOBY TRANSCRIPT
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-3">
                  {user.google_user_data.picture && (
                    <img
                      src={user.google_user_data.picture}
                      alt={user.google_user_data.name || "User"}
                      className="w-8 h-8 rounded-full border-2 border-purple-500/50"
                    />
                  )}
                  <span className="text-sm text-gray-400">
                    {user.google_user_data.name || user.email}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
