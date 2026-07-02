import React, { useState, useEffect } from "react";
import { LoggedUser, Filial, UserRole, Usuario } from "../types";
import { getFiliais, getUsuarios } from "../services/dbService";
import { CooperacreSymbol } from "./CooperacreLogo";
import { ShieldCheck, User, Building2, KeyRound, ArrowRight, AlertCircle } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: LoggedUser) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("master");
  const [selectedFilialId, setSelectedFilialId] = useState("");
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const branches = getFiliais();
    setFiliais(branches);
    if (branches.length > 0) {
      setSelectedFilialId(branches[0].id);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Por favor, digite o usuário.");
      return;
    }
    if (!password) {
      setError("Por favor, digite a senha.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Fetch dynamic users registered in the database
      const registeredUsers = getUsuarios();
      const matchedUser = registeredUsers.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (matchedUser) {
        // Match user's assigned role and filial
        const correctPassword = matchedUser.password || "123";
        if (password !== correctPassword) {
          setError("Senha incorreta.");
          setIsSubmitting(false);
          return;
        }

        const logged: LoggedUser = {
          username: matchedUser.username,
          role: matchedUser.role,
          filialId: matchedUser.filialId,
          filialName: matchedUser.filialName,
        };

        setIsSubmitting(false);
        onLoginSuccess(logged);
        return;
      }

      // Fallback fallback to standard presets if not in database
      if (password !== "123") {
        setError("Senha inválida (Dica: use a senha padrão '123' para os presets ou a senha cadastrada).");
        setIsSubmitting(false);
        return;
      }

      let userFilial: Filial | undefined;
      if (role !== "master") {
        userFilial = filiais.find((f) => f.id === selectedFilialId);
        if (!userFilial) {
          setError("Por favor, selecione uma filial válida.");
          setIsSubmitting(false);
          return;
        }
      }

      const logged: LoggedUser = {
        username: username.trim(),
        role: role,
        filialId: role !== "master" ? selectedFilialId : undefined,
        filialName: role !== "master" && userFilial ? userFilial.name : undefined,
      };

      setIsSubmitting(false);
      onLoginSuccess(logged);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300" id="login-screen">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-700/10 dark:bg-emerald-700/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-900/85 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl dark:shadow-2xl space-y-6 relative z-10 transition-colors duration-300">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 mb-2 transform hover:scale-105 transition-transform">
            <CooperacreSymbol size={54} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">CooperLog</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
            Sistema de Auditoria e Conformidade de Carregamentos • Cooperacre
          </p>
        </div>

        {/* Access Level Selector */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-850">
          {(["master", "supervisor", "operador"] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setError(null);
                // Adjust default users for presets
                if (r === "master") setUsername("admin");
                else if (r === "supervisor") setUsername("supervisor");
                else setUsername("operador");
              }}
              className={`py-2 px-1 text-center text-[10px] font-extrabold uppercase rounded-lg tracking-wider transition cursor-pointer ${
                role === r
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {r === "master" ? "Master" : r === "supervisor" ? "Supervisor" : "Operador"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Branch Selector (Only if not Master) */}
          {role !== "master" && (
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 block">
                Filial de Atuação
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                <select
                  value={selectedFilialId}
                  onChange={(e) => setSelectedFilialId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                >
                  {filiais.map((f) => (
                    <option key={f.id} value={f.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {f.name} ({f.city}-{f.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 block">
              Usuário
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: admin"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 block">
              Senha
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
          >
            {isSubmitting ? "Autenticando..." : "Entrar no Sistema"}
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
