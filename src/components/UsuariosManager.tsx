import React, { useState, useEffect } from "react";
import { Usuario, Filial, UserRole } from "../types";
import { getUsuarios, saveUsuario, deleteUsuario, getFiliais } from "../services/dbService";
import { 
  Plus, Search, User, Key, ShieldCheck, Trash2, ArrowLeft, 
  Building2, CheckCircle, HelpCircle, UserPlus, Lock 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UsuariosManagerProps {
  onBack: () => void;
  currentUser: { username: string };
}

export default function UsuariosManager({ onBack, currentUser }: UsuariosManagerProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("operador");
  const [selectedFilialId, setSelectedFilialId] = useState("");
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    setUsuarios(getUsuarios());
    const listFiliais = getFiliais();
    setFiliais(listFiliais);
    if (listFiliais.length > 0) {
      setSelectedFilialId(listFiliais[0].id);
    }
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password.trim()) {
      setErrorMsg("Por favor, preencha o nome de usuário e a senha.");
      return;
    }

    // Check duplicate
    const exists = usuarios.some(u => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      setErrorMsg(`O usuário "${username}" já está cadastrado.`);
      return;
    }

    // Determine filial details
    let filialId: string | undefined = undefined;
    let filialName: string | undefined = undefined;

    if (role !== "master") {
      const selectedFilial = filiais.find(f => f.id === selectedFilialId);
      if (!selectedFilial) {
        setErrorMsg("Selecione uma filial válida para este cargo.");
        return;
      }
      filialId = selectedFilial.id;
      filialName = selectedFilial.name;
    }

    const newId = `user-${Math.random().toString(36).substring(2, 9)}`;
    const newUsuario: Usuario = {
      id: newId,
      username: username.trim(),
      password: password.trim(),
      role,
      filialId,
      filialName,
      createdAt: new Date().toISOString()
    };

    await saveUsuario(newUsuario);
    const updated = getUsuarios();
    setUsuarios(updated);

    // Reset Form
    setUsername("");
    setPassword("");
    setRole("operador");
    setShowAddForm(false);

    setSuccessMsg(`Usuário "${newUsuario.username}" cadastrado com sucesso!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (name.toLowerCase() === "admin") {
      alert("Não é permitido excluir o usuário principal 'admin'.");
      return;
    }

    if (name.toLowerCase() === currentUser.username.toLowerCase()) {
      alert("Você não pode excluir o seu próprio usuário enquanto está conectado.");
      return;
    }

    if (window.confirm(`Tem certeza de que deseja excluir o usuário "${name}"? Ele perderá acesso ao painel de expedição imediatamente.`)) {
      await deleteUsuario(id);
      setUsuarios(getUsuarios());
      
      setSuccessMsg(`Usuário "${name}" excluído.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const filteredUsuarios = usuarios.filter((u) => {
    return (
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.filialName && u.filialName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            title="Voltar para o Painel"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Gerenciamento de Usuários</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wide">Controle de Credenciais & Perfis de Acesso</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          {showAddForm ? "Cancelar Cadastro" : "Cadastrar Novo Usuário"}
          <UserPlus size={15} />
        </button>
      </div>

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <CheckCircle size={16} className="text-emerald-600" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Add User Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddUser} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserPlus size={16} className="text-emerald-700" />
                Novas Credenciais de Acesso
              </h3>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Lock size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome de Usuário</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ex: joao.silva"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-9 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 outline-none transition font-semibold"
                    />
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Senha Provisória</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Senha do usuário"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-9 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 outline-none transition font-mono font-semibold"
                    />
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* Role Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cargo / Nível de Acesso</label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 outline-none transition font-semibold"
                    >
                      <option value="operador">Operador (Expedição)</option>
                      <option value="supervisor">Supervisor (Auditor)</option>
                      <option value="master">Master (Administrador Geral)</option>
                    </select>
                  </div>
                </div>

                {/* Associated Filial Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Filial Associada {role === "master" && <span className="text-[9px] text-emerald-600">(Todas Unidades)</span>}
                  </label>
                  <div className="relative">
                    <select
                      disabled={role === "master"}
                      value={selectedFilialId}
                      onChange={(e) => setSelectedFilialId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 outline-none transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {filiais.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User list and filtration */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filter bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome de usuário, cargo ou filial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Mostrando <strong>{filteredUsuarios.length}</strong> de <strong>{usuarios.length}</strong> usuários cadastrados
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="px-6 py-3.5">Nome de Usuário</th>
                <th className="px-6 py-3.5">Nível de Acesso (Cargo)</th>
                <th className="px-6 py-3.5">Filial de Operação</th>
                <th className="px-6 py-3.5">Senha Provisória</th>
                <th className="px-6 py-3.5">Cadastrado Em</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-mono">
                    Nenhum usuário correspondente encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => {
                  const isSelf = u.username.toLowerCase() === currentUser.username.toLowerCase();
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/40 transition-colors ${isSelf ? "bg-emerald-50/20" : ""}`}>
                      <td className="px-6 py-4 font-bold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                          <User size={13} />
                        </div>
                        <div>
                          <span>{u.username}</span>
                          {isSelf && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[9px] font-black uppercase">
                              Você
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          u.role === "master"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : u.role === "supervisor"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          <ShieldCheck size={11} />
                          {u.role === "master" ? "Master Admin" : u.role === "supervisor" ? "Supervisor" : "Operador"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === "master" ? (
                          <span className="text-slate-400 italic">Unidades Unificadas</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400" />
                            <span className="font-semibold text-slate-600">{u.filialName || "Não Atribuída"}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 px-2 py-1 rounded text-[11px] font-mono text-slate-600 tracking-wider">
                          {u.password || "123"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={u.username.toLowerCase() === "admin" || isSelf}
                          onClick={() => handleDelete(u.id, u.username)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Excluir Usuário"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex flex-col sm:flex-row gap-4">
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl h-fit self-start sm:self-auto shrink-0">
          <HelpCircle size={22} />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Como funciona o controle de acessos?</h4>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Usuários com o cargo de <strong>Operador</strong> ou <strong>Supervisor</strong> realizam o login em suas filiais locais designadas. Suas visões de dados serão automaticamente restringidas a apenas ver ou registrar carregamentos pertinentes a essa filial. Usuários <strong>Master</strong> possuem visibilidade total e centralizada do painel, permitindo auditoria cruzada em tempo real de todo o fluxo.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
