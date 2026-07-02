/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Carregamento, LoggedUser, Filial } from "../types";
import { getFiliais } from "../services/dbService";
import { 
  Plus, Search, Filter, Calendar, Truck, CheckCircle, Clock, 
  FileText, ShieldAlert, BarChart3, TrendingUp, AlertCircle, ArrowRight,
  LogOut, Building2, Share2, Trash2, SlidersHorizontal, User
} from "lucide-react";
import { CooperacreSymbol } from "./CooperacreLogo";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  carregamentos: Carregamento[];
  user: LoggedUser;
  onStartNew: () => void;
  onResume: (id: string) => void;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onManageFiliais: () => void;
  onManageUsuarios: () => void;
  onLogout: () => void;
}

export default function Dashboard({ 
  carregamentos, 
  user, 
  onStartNew, 
  onResume, 
  onView, 
  onDelete, 
  onManageFiliais, 
  onManageUsuarios,
  onLogout 
}: DashboardProps) {
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "finalized">("all");
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [selectedFilialFilter, setSelectedFilialFilter] = useState<string>("all");

  useEffect(() => {
    setFiliais(getFiliais());
  }, []);

  // Filter carregamentos based on user's branch / role
  const filialFilteredCarregamentos = useMemo(() => {
    return carregamentos.filter((c) => {
      if (user.role !== "master") {
        return c.filialId === user.filialId;
      }
      if (selectedFilialFilter !== "all") {
        return c.filialId === selectedFilialFilter;
      }
      return true;
    });
  }, [carregamentos, user, selectedFilialFilter]);

  // Calculate stats based on branch filter
  const stats = useMemo(() => {
    const total = filialFilteredCarregamentos.length;
    const finalizados = filialFilteredCarregamentos.filter((c) => c.status === "finalized").length;
    const emAndamento = total - finalizados;

    let totalMinutes = 0;
    let counts = 0;
    filialFilteredCarregamentos.forEach((c) => {
      if (c.status === "finalized" && c.finalizedAt) {
        const duration = (new Date(c.finalizedAt).getTime() - new Date(c.createdAt).getTime()) / (60 * 1000);
        if (duration > 0 && duration < 600) {
          totalMinutes += duration;
          counts++;
        }
      }
    });

    const tempoMedioMinutos = counts > 0 ? Math.round(totalMinutes / counts) : 34;

    return { total, finalizados, emAndamento, tempoMedioMinutos };
  }, [filialFilteredCarregamentos]);

  // Filter list with search and status filters
  const filteredCarregamentos = useMemo(() => {
    return filialFilteredCarregamentos.filter((c) => {
      const matchSearch =
        c.placa.toLowerCase().includes(search.toLowerCase()) ||
        c.cliente.toLowerCase().includes(search.toLowerCase()) ||
        c.motorista.toLowerCase().includes(search.toLowerCase()) ||
        c.pedido.toLowerCase().includes(search.toLowerCase()) ||
        c.notaFiscal.toLowerCase().includes(search.toLowerCase()) ||
        c.transportadora.toLowerCase().includes(search.toLowerCase()) ||
        (c.filialName && c.filialName.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [filialFilteredCarregamentos, search, statusFilter]);

  // WhatsApp share helper
  const handleShareWhatsapp = (c: Carregamento) => {
    const appUrl = window.location.href.split("?")[0];
    const message = `*COOPERLOG - Relatório de Carga Cooperacre* 🌿🚛\n\n` +
      `*Protocolo:* ${c.protocolo || "Pendente"}\n` +
      `*Unidade/Filial:* ${c.filialName || "Matriz"}\n` +
      `*Status:* Finalizado e Homologado ✅\n\n` +
      `*Motorista:* ${c.motorista}\n` +
      `*Placa Veículo:* ${c.placa}\n` +
      `*Cliente:* ${c.cliente}\n` +
      `*Pedido:* ${c.pedido} | *NF:* ${c.notaFiscal}\n` +
      `*Lacre:* ${c.numeroLacre || "Não informado"}\n\n` +
      `*Acesse a auditoria de evidências completas:* \n${appUrl}?view=${c.id}`;
    
    const encodedText = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 25 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6" 
      id="dashboard-main-content"
    >
      {/* Session Header Profile Bar */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm transition-colors duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-800 dark:text-emerald-300 relative">
            <User size={20} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-ping" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Olá, {user.username}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                user.role === "master" 
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50" 
                  : user.role === "supervisor"
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40"
              }`}>
                {user.role === "master" ? "Master Admin" : user.role === "supervisor" ? "Supervisor" : "Operador"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {user.role === "master" ? "Acesso Geral Consolidado • Cooperacre" : `Unidade: ${user.filialName || "Matriz"}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter for Master */}
          {user.role === "master" && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all">
              <Building2 size={14} className="text-emerald-700 dark:text-emerald-400 animate-pulse" />
              <select
                value={selectedFilialFilter}
                onChange={(e) => setSelectedFilialFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-0 cursor-pointer pr-1"
              >
                <option value="all" className="dark:bg-slate-800 text-slate-700 dark:text-slate-200">Todas as Filiais</option>
                {filiais.map((f) => (
                  <option key={f.id} value={f.id} className="dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Master specific Branch Manager button */}
          {user.role === "master" && (
            <button
              onClick={onManageFiliais}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-all cursor-pointer hover:shadow-sm"
            >
              <Building2 size={14} className="text-slate-500 dark:text-slate-400" />
              Filiais (CNPJs)
            </button>
          )}

          {/* Master specific User Manager button */}
          {user.role === "master" && (
            <button
              onClick={onManageUsuarios}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-all cursor-pointer hover:shadow-sm"
            >
              <User size={14} className="text-slate-500 dark:text-slate-400" />
              Usuários
            </button>
          )}

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/45 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-900/40 rounded-xl transition-all cursor-pointer hover:shadow-sm"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </motion.div>

      {/* Top Banner / Welcome */}
      <motion.div 
        variants={itemVariants}
        whileHover={{ scale: 1.005 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-gradient-to-r from-emerald-800 via-emerald-900 to-emerald-950 text-white p-6 md:p-8 rounded-2xl shadow-md border border-emerald-700/50 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center p-12">
          <Truck size={180} className="text-white rotate-12" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4 z-10">
          <div className="bg-white p-2 rounded-xl shadow-sm self-start md:self-auto shrink-0 flex items-center justify-center transition-transform duration-500 hover:rotate-6">
            <CooperacreSymbol size={44} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-400/30">
                Expedição Cooperacre
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">CooperLog</h1>
            <p className="text-emerald-100/90 text-sm max-w-xl leading-relaxed">
              Rastrabilidade digital e auditoria fotográfica para garantia de conformidade das cargas.
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartNew}
          className="z-10 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-transparent hover:border-emerald-200"
        >
          <Plus size={18} className="stroke-[3]" />
          Novo Carregamento
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total de Cargas",
            value: stats.total,
            icon: <Truck size={24} />,
            bg: "bg-slate-100 text-slate-700",
            hoverAccent: "group-hover:text-slate-800"
          },
          {
            title: "Concluídos (Auditados)",
            value: stats.finalizados,
            icon: <CheckCircle size={24} />,
            bg: "bg-emerald-50 text-emerald-700 border border-emerald-100",
            hoverAccent: "group-hover:text-emerald-800"
          },
          {
            title: "Em Rascunho",
            value: stats.emAndamento,
            icon: <Clock size={24} />,
            bg: "bg-amber-50 text-amber-700 border border-amber-100",
            hoverAccent: "group-hover:text-amber-800"
          },
          {
            title: "Tempo Médio Carga",
            value: `${stats.tempoMedioMinutos} min`,
            icon: <TrendingUp size={24} />,
            bg: "bg-emerald-50 text-emerald-800 border border-emerald-100",
            hoverAccent: "group-hover:text-emerald-900"
          }
        ].map((item, idx) => (
          <motion.div
            key={item.title}
            variants={itemVariants}
            whileHover={{ scale: 1.025, y: -4 }}
            className="group bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-default"
          >
            <div className={`p-3 rounded-lg transition-transform duration-300 group-hover:scale-110 ${item.bg}`}>
              {item.icon}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">{item.title}</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{item.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid Filter and List */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Filter bar */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por placa, motorista, cliente, NF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl py-2.5 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Animated Tab Selector Pill */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl relative border border-slate-200 dark:border-slate-700">
            {[
              { id: "all", label: `Todos (${filialFilteredCarregamentos.length})`, icon: null },
              { id: "finalized", label: `Finalizados (${filialFilteredCarregamentos.filter(c => c.status === "finalized").length})`, icon: <CheckCircle size={13} /> },
              { id: "draft", label: `Rascunhos (${filialFilteredCarregamentos.filter(c => c.status === "draft").length})`, icon: <Clock size={13} /> }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-4 py-2 text-xs font-black rounded-lg transition-colors duration-200 shrink-0 flex items-center gap-1.5 cursor-pointer relative z-10 ${
                    isActive ? "text-emerald-900 dark:text-emerald-250 font-extrabold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeFilterTab"
                      className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-600/50 -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content table */}
        {filteredCarregamentos.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
              <Search size={32} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">Nenhum carregamento encontrado</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Revise os termos de busca ou filtros de status aplicados.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table view (Visible only on md screens and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Placa & Veículo</th>
                    <th className="px-6 py-3.5">Unidade / Filial</th>
                    <th className="px-6 py-3.5">Cliente</th>
                    <th className="px-6 py-3.5">Pedido / NF</th>
                    <th className="px-6 py-3.5">Motorista</th>
                    <th className="px-6 py-3.5">Última Atualização</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  <AnimatePresence mode="popLayout">
                    {filteredCarregamentos.map((c) => (
                      <motion.tr 
                        key={c.id} 
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group/row"
                      >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                            <Truck size={18} className="text-slate-650 dark:text-slate-400" />
                          </div>
                          <div>
                            <span className="font-mono bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 border border-yellow-400/30 text-xs font-bold px-2 py-0.5 rounded tracking-wider">
                              {c.placa}
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate max-w-[150px]">
                              {c.transportadora}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 px-2 py-1 rounded">
                          {c.filialName || "Matriz"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-[180px]">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{c.cliente}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <FileText size={12} className="text-slate-400" />
                            <span className="font-medium">{c.pedido}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 font-mono">{c.notaFiscal}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{c.motorista}</p>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{formatDate(c.updatedAt)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {c.status === "finalized" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Finalizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Rascunho
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {c.status === "finalized" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onView(c.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition cursor-pointer"
                            >
                              Ver Protocolo
                            </button>
                            <button
                              onClick={() => handleShareWhatsapp(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-350 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg transition cursor-pointer"
                              title="Enviar via WhatsApp"
                            >
                              <Share2 size={12} />
                              WhatsApp
                            </button>
                            {user.role === "master" && (
                              <button
                                onClick={() => onDelete(c.id)}
                                className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition hover:scale-105 cursor-pointer shrink-0"
                                title="Apagar Protocolo Permanente"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onResume(c.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition shadow-sm cursor-pointer"
                            >
                              Retomar
                              <ArrowRight size={12} />
                            </button>
                            <button
                              onClick={() => onDelete(c.id)}
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition hover:scale-105 cursor-pointer"
                              title="Excluir Rascunho"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Visible only on screens below md) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              <AnimatePresence mode="popLayout">
                {filteredCarregamentos.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="p-4 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-mono bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 border border-yellow-400/30 text-xs font-bold px-2 py-0.5 rounded tracking-wider">
                          {c.placa}
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono">
                          {c.protocolo || "Sem Protocolo"}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-350 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-2 py-0.5 rounded">
                          {c.filialName || "Matriz"}
                        </span>
                        {c.status === "finalized" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Finalizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Rascunho
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Details Block */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs bg-slate-50 dark:bg-slate-900/55 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block">Cliente</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block max-w-[130px]">{c.cliente}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block">Motorista</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block max-w-[130px]">{c.motorista}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block">Pedido / NF / Transportadora</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 block truncate">
                          {c.pedido} | {c.notaFiscal} | <span className="text-slate-500 font-normal">{c.transportadora}</span>
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block">Atualizado em</span>
                        <span className="text-slate-500 dark:text-slate-450 block font-mono text-[10px]">{formatDate(c.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {!(user.role !== "master" && c.status === "finalized") && (
                        <button
                          onClick={() => onDelete(c.id)}
                          className="p-2 text-rose-650 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40 transition cursor-pointer"
                          title={c.status === "finalized" ? "Apagar Protocolo Permanente" : "Excluir Rascunho"}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      <div className="flex gap-1.5">
                        {c.status === "finalized" ? (
                          <>
                            <button
                              onClick={() => handleShareWhatsapp(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 rounded-lg transition cursor-pointer"
                            >
                              <Share2 size={12} />
                              Zap
                            </button>
                            <button
                              onClick={() => onView(c.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition cursor-pointer"
                            >
                              Ver Protocolo
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onResume(c.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition shadow-sm cursor-pointer"
                          >
                            Retomar
                            <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>

      {/* Mandatory Guidelines Indicator Infobox */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-200/80 dark:border-emerald-900/40 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 transition-colors duration-300">
        <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0 self-start">
          <AlertCircle size={22} />
        </div>
        <div className="space-y-1.5">
          <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">Diretrizes Obrigatórias de Auditoria</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Em conformidade com as regras logísticas da Cooperacre, todo carregamento só pode ser finalizado após o registro fotográfico de 3 etapas de embarque, 1 vídeo de conferência de 5 a 8 minutos, verificação física dos lacres numerados, além das assinaturas eletrônicas do motorista e conferente.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">✓ 6 Fotos de Carga</span>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">✓ Vídeo de Auditoria</span>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">✓ Lacre Associado</span>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">✓ Dupla Assinatura</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
