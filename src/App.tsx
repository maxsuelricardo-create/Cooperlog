/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Carregamento, LoggedUser, Filial } from "./types";
import { 
  getCarregamentos, 
  getCarregamento,
  saveCarregamento, 
  seedInitialDataIfEmpty, 
  deleteCarregamento,
  getFiliais,
  getUsuarios
} from "./services/dbService";
import { decryptId } from "./services/crypto";
import Dashboard from "./components/Dashboard";
import Wizard from "./components/Wizard";
import AuditReport from "./components/AuditReport";
import Login from "./components/Login";
import FiliaisManager from "./components/FiliaisManager";
import UsuariosManager from "./components/UsuariosManager";
import { ShieldCheck, Truck, RefreshCw, Layers, LogOut, Sun, Moon, AlertTriangle, Trash2, Lock, X } from "lucide-react";
import { CooperacreSymbol } from "./components/CooperacreLogo";

type ViewMode = "dashboard" | "wizard" | "view" | "filiais" | "usuarios";

export default function App() {
  const [carregamentos, setCarregamentos] = useState<Carregamento[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard");
  const [selectedLoad, setSelectedLoad] = useState<Carregamento | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<LoggedUser | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [publicViewLoad, setPublicViewLoad] = useState<Carregamento | null>(null);
  const [publicViewError, setPublicViewError] = useState<string | null>(null);

  // States for custom deletion modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState<string>("");
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [deleteConfirmedCheckbox, setDeleteConfirmedCheckbox] = useState<boolean>(false);

  // Restore theme on load
  useEffect(() => {
    const savedTheme = localStorage.getItem("cooperlog_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Update root element class when theme changes
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("cooperlog_theme", theme);
  }, [theme]);

  // Restore session from localStorage on load
  useEffect(() => {
    const savedSession = localStorage.getItem("cooperlog_session");
    if (savedSession) {
      try {
        setCurrentUser(JSON.parse(savedSession));
      } catch (err) {
        console.error("Erro ao ler sessão restaurada:", err);
      }
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Ensure mock/seed data is populated if DB is completely empty
        await seedInitialDataIfEmpty();

        const params = new URLSearchParams(window.location.search);
        const shareToken = params.get("share");
        const rawViewId = params.get("view");

        let viewId = rawViewId;
        if (shareToken) {
          const decrypted = decryptId(shareToken);
          if (decrypted) {
            viewId = decrypted;
          } else if (!viewId) {
            setPublicViewError("Token de compartilhamento inválido ou corrompido.");
          }
        }

        if (viewId) {
          const singleLoad = await getCarregamento(viewId);
          if (singleLoad) {
            setPublicViewLoad(singleLoad);
            setSelectedLoad(singleLoad);
            setCurrentView("view");
          } else {
            setPublicViewError("Protocolo não encontrado ou ID inválido.");
          }
        }

        const data = await getCarregamentos();
        setCarregamentos(data);

        // Update public view load with the fresh list data if available
        if (viewId) {
          const freshLoad = data.find(c => c.id === viewId);
          if (freshLoad) {
            setPublicViewLoad(freshLoad);
            setSelectedLoad(freshLoad);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do CooperLog:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Action: Handle login success
  const handleLoginSuccess = (user: LoggedUser) => {
    setCurrentUser(user);
    localStorage.setItem("cooperlog_session", JSON.stringify(user));
    setCurrentView("dashboard");
  };

  // Action: Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("cooperlog_session");
    setCurrentView("dashboard");
  };

  // Action: Start a brand new load
  const handleStartNewLoad = async () => {
    // Generate an ID for the load
    const today = new Date();
    const prefix = "CL-" + today.getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random
    const newId = `${prefix}-${randomSuffix}`;

    // Tag the load with the user's active filial (branch)
    let activeFilialId = "filial-rb";
    let activeFilialName = "Rio Branco - Matriz";

    if (currentUser && currentUser.role !== "master") {
      activeFilialId = currentUser.filialId || "filial-rb";
      activeFilialName = currentUser.filialName || "Rio Branco - Matriz";
    } else {
      // If master user creates it, default to Rio Branco Matriz as the primary database partition
      const filiais = getFiliais();
      if (filiais.length > 0) {
        activeFilialId = filiais[0].id;
        activeFilialName = filiais[0].name;
      }
    }

    const newLoad: Carregamento = {
      id: newId,
      pedido: "",
      notaFiscal: "",
      cliente: "",
      transportadora: "",
      motorista: "",
      motoristaDocumento: "",
      placa: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      protocolo: null,
      finalizedAt: null,
      fotosAntes: {
        foto1: null,
        foto2: null,
        foto3: null,
      },
      videoUrl: null,
      videoDuration: null,
      videoSize: null,
      videoRecordedReal: false,
      fotosDepois: {
        foto1: null,
        foto2: null,
        foto3: null,
      },
      fotoLacreAproximada: null,
      fotoLacreVeiculo: null,
      numeroLacre: "",
      lacreTransportadora: "",
      assinaturaMotorista: null,
      conferenteConfirmado: false,
      conferenteNome: null,
      conferenteConfirmadoAt: null,
      filialId: activeFilialId,
      filialName: activeFilialName,
    };

    try {
      setIsLoading(true);
      await saveCarregamento(newLoad);
      const list = await getCarregamentos();
      setCarregamentos(list);
      setSelectedLoad(newLoad);
      setCurrentView("wizard");
    } catch (err) {
      console.error("Erro ao criar novo carregamento:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Resume an existing draft
  const handleResumeLoad = (id: string) => {
    const found = carregamentos.find((c) => c.id === id);
    if (found && found.status === "draft") {
      setSelectedLoad(found);
      setCurrentView("wizard");
    }
  };

  // Action: View finalized protocol
  const handleViewProtocol = (id: string) => {
    const found = carregamentos.find((c) => c.id === id);
    if (found) {
      setSelectedLoad(found);
      setCurrentView("view");
    }
  };

  // Action: Save loading state from wizard
  const handleSaveWizardProgress = async (updated: Carregamento) => {
    try {
      await saveCarregamento(updated);
      const list = await getCarregamentos();
      setCarregamentos(list);
    } catch (err) {
      console.error("Erro ao salvar progresso do rascunho:", err);
    }
  };

  // Action: Finalize cargo and issue protocol
  const handleFinalizeLoad = async (finalObj: Carregamento, protocolId: string) => {
    const finalizedObj: Carregamento = {
      ...finalObj,
      status: "finalized",
      protocolo: protocolId,
      finalizedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsLoading(true);
      await saveCarregamento(finalizedObj);
      const list = await getCarregamentos();
      setCarregamentos(list);
      setSelectedLoad(finalizedObj);
      setCurrentView("view");
    } catch (err) {
      console.error("Erro ao finalizar carregamento no banco:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Start delete flow (Custom React-based modal confirmation)
  const handleDeleteLoad = (id: string) => {
    const found = carregamentos.find(c => c.id === id);
    if (!found) return;
    setDeleteTargetId(id);
    setDeletePassword("");
    setDeletePasswordError(null);
    setDeleteConfirmedCheckbox(false);
  };

  // Action: Confirm and process deletion
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const found = carregamentos.find(c => c.id === deleteTargetId);
    if (!found) return;

    if (found.status === "finalized") {
      if (currentUser?.role !== "master") {
        setDeletePasswordError("Apenas administradores Master têm permissão para excluir relatórios gerados!");
        return;
      }
      // Validate master password
      const users = getUsuarios();
      const masterUsers = users.filter(u => u.role === "master");
      const isValid = masterUsers.length > 0
        ? masterUsers.some(u => u.password === deletePassword)
        : deletePassword === "07222807";

      if (!isValid) {
        setDeletePasswordError("Senha master incorreta! A exclusão foi cancelada.");
        return;
      }

      if (!deleteConfirmedCheckbox) {
        setDeletePasswordError("Você deve marcar a caixa de confirmação para prosseguir.");
        return;
      }
    }

    try {
      setIsLoading(true);
      await deleteCarregamento(deleteTargetId);
      const list = await getCarregamentos();
      setCarregamentos(list);
      if (selectedLoad && selectedLoad.id === deleteTargetId) {
        setSelectedLoad(null);
        setCurrentView("dashboard");
      }
      setDeleteTargetId(null);
    } catch (err) {
      console.error("Erro ao excluir carregamento:", err);
      setDeletePasswordError("Ocorreu um erro ao excluir o registro do banco de dados.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-emerald-800 border-b border-emerald-700 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <CooperacreSymbol size={30} />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight flex items-center gap-1 uppercase">
                CooperLog
              </span>
              <p className="text-[10px] text-emerald-200 font-mono -mt-0.5 uppercase tracking-widest font-semibold">Cooperacre Expedição</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-700/60 hover:bg-emerald-600 border border-emerald-600/50 text-emerald-100 hover:text-white transition cursor-pointer shadow-sm"
              title={theme === "light" ? "Alternar para Tema Escuro" : "Alternar para Tema Claro"}
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {currentUser && (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Desktop Username badge */}
                <div className="hidden sm:flex items-center gap-2 text-xs bg-emerald-700/60 py-1.5 px-3.5 rounded-lg border border-emerald-600/50">
                  <ShieldCheck className="text-emerald-300" size={14} />
                  <span className="font-semibold text-emerald-50">
                    {currentUser.username} ({currentUser.role === "master" ? "Master" : currentUser.role === "supervisor" ? "Supervisor" : "Operador"})
                  </span>
                </div>

                {/* Mobile Username badge - compact */}
                <div className="sm:hidden flex items-center gap-1 bg-emerald-700/60 px-2 py-1 rounded-lg border border-emerald-600/50 text-[10px] font-bold text-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="uppercase">{currentUser.username}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-750 border border-rose-500 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                  title="Sair do Sistema"
                >
                  <LogOut size={13} className="stroke-[2.5]" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Primary Workspace container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-none">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw size={36} className="text-emerald-500 animate-spin" />
            <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">
              Carregando base de dados CooperLog...
            </p>
          </div>
        ) : publicViewLoad ? (
          <AuditReport
            carregamento={publicViewLoad}
            onBack={() => {
              // Clear query parameters
              window.history.pushState({}, "", window.location.pathname);
              setPublicViewLoad(null);
              setSelectedLoad(null);
              setCurrentView("dashboard");
            }}
            isGuest={!currentUser}
          />
        ) : publicViewError ? (
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Protocolo Não Encontrado
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {publicViewError}
              </p>
            </div>
            <button
              onClick={() => {
                window.history.pushState({}, "", window.location.pathname);
                setPublicViewError(null);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm text-sm transition cursor-pointer"
            >
              Ir para Tela de Login
            </button>
          </div>
        ) : !currentUser ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {currentView === "dashboard" && (
              <Dashboard
                carregamentos={carregamentos}
                user={currentUser}
                onStartNew={handleStartNewLoad}
                onResume={handleResumeLoad}
                onView={handleViewProtocol}
                onDelete={handleDeleteLoad}
                onManageFiliais={() => setCurrentView("filiais")}
                onManageUsuarios={() => setCurrentView("usuarios")}
                onLogout={handleLogout}
              />
            )}

            {currentView === "filiais" && (
              <FiliaisManager
                onBack={() => setCurrentView("dashboard")}
              />
            )}

            {currentView === "usuarios" && (
              <UsuariosManager
                onBack={() => setCurrentView("dashboard")}
                currentUser={currentUser}
              />
            )}

            {currentView === "wizard" && selectedLoad && (
              <Wizard
                initialCarregamento={selectedLoad}
                onSave={handleSaveWizardProgress}
                onFinalize={handleFinalizeLoad}
                onCancel={() => setCurrentView("dashboard")}
                currentUser={currentUser}
              />
            )}

            {currentView === "view" && selectedLoad && (
              <AuditReport
                carregamento={selectedLoad}
                onBack={() => setCurrentView("dashboard")}
                onDelete={currentUser?.role === "master" ? handleDeleteLoad : undefined}
              />
            )}
          </>
        )}
      </main>

      {/* Footer bar */}
      <footer className="bg-emerald-950 border-t border-emerald-900 text-emerald-300 text-xs py-6 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-lg">
              <CooperacreSymbol size={26} />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                © 2026 Cooperacre Cooperativa de Produtores do Acre. Todos os direitos reservados.
              </p>
              <p className="text-[10px] text-emerald-200/90 font-medium mt-0.5">
                Desenvolvido por <span className="font-bold text-emerald-100 hover:text-white transition">Maxsuel Ricardo</span>
              </p>
            </div>
          </div>

        </div>
      </footer>

      {/* Custom Deletion Confirmation Modal */}
      {deleteTargetId && (() => {
        const loadToDelete = carregamentos.find(c => c.id === deleteTargetId);
        if (!loadToDelete) return null;
        const isFinalized = loadToDelete.status === "finalized";
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {isFinalized ? "Excluir Protocolo Permanente" : "Excluir Rascunho"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-450">
                    {isFinalized 
                      ? `Você está prestes a excluir o protocolo finalizado e homologado: ${loadToDelete.protocolo || loadToDelete.id}`
                      : `Você está prestes a excluir o rascunho de carregamento da placa: ${loadToDelete.placa || "Não informada"}`}
                  </p>
                </div>
              </div>

              {isFinalized ? (
                <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-150 dark:border-slate-800/80">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    ATENÇÃO: Este protocolo está finalizado. Para confirmar a exclusão definitiva, digite a <strong>SENHA MASTER</strong> do sistema e marque o termo de ciência.
                  </p>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">Senha Master</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Digite a senha master"
                        value={deletePassword}
                        onChange={(e) => {
                          setDeletePassword(e.target.value);
                          setDeletePasswordError(null);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-slate-100 rounded-lg py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1.5">
                    <input
                      type="checkbox"
                      checked={deleteConfirmedCheckbox}
                      onChange={(e) => {
                        setDeleteConfirmedCheckbox(e.target.checked);
                        setDeletePasswordError(null);
                      }}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug font-medium select-none">
                      Estou ciente de que esta ação apagará permanentemente o protocolo e <strong>TODAS as evidências fotográficas/vídeos</strong>. Esta ação não poderá ser desfeita.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950/45 p-4 rounded-xl border border-slate-150 dark:border-slate-800/40">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tem certeza de que deseja apagar este rascunho de carregamento? Todas as informações parciais preenchidas serão perdidas. Esta ação não pode ser desfeita.
                  </p>
                </div>
              )}

              {deletePasswordError && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-semibold">
                  <span>⚠️ {deletePasswordError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm hover:shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
