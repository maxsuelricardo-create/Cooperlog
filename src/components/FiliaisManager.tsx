import React, { useState, useEffect } from "react";
import { Filial } from "../types";
import { getFiliais, saveFilial, deleteFilial } from "../services/dbService";
import { Plus, Search, Building2, Trash2, ArrowLeft, MapPin, Hash, CheckCircle, HelpCircle, FileText } from "lucide-react";

interface FiliaisManagerProps {
  onBack: () => void;
}

export default function FiliaisManager({ onBack }: FiliaisManagerProps) {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("AC");
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load filiais on mount
  useEffect(() => {
    setFiliais(getFiliais());
  }, []);

  // Format CNPJ as typing (XX.XXX.XXX/XXXX-XX)
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 14) value = value.substring(0, 14);

    if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, "$1.$2.$3/$4");
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{3})/, "$1.$2");
    }
    setCnpj(value);
  };

  const handleAddFilial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cnpj || !city.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const cleanedCnpj = cnpj.replace(/\D/g, "");
    if (cleanedCnpj.length !== 14) {
      alert("O CNPJ deve conter exatamente 14 dígitos.");
      return;
    }

    const newId = `filial-${Math.random().toString(36).substring(2, 9)}`;
    const newFilial: Filial = {
      id: newId,
      cnpj,
      name: name.trim(),
      city: city.trim(),
      state: state.toUpperCase(),
      createdAt: new Date().toISOString(),
    };

    await saveFilial(newFilial);
    const updated = getFiliais();
    setFiliais(updated);

    // Reset Form
    setName("");
    setCnpj("");
    setCity("");
    setState("AC");
    setShowAddForm(false);

    setSuccessMsg(`Filial "${newFilial.name}" cadastrada com sucesso!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDelete = async (id: string, filialName: string) => {
    if (id === "filial-rb") {
      alert("Não é permitido excluir a Filial Matriz principal por razões de auditoria histórica.");
      return;
    }

    if (window.confirm(`Tem certeza de que deseja excluir a filial "${filialName}"? Esta ação removerá a unidade do painel de controle.`)) {
      await deleteFilial(id);
      setFiliais(getFiliais());
    }
  };

  const filteredFiliais = filiais.filter((f) => {
    return (
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cnpj.includes(searchQuery) ||
      f.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6" id="filiais-manager-panel">
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition text-slate-600 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 size={22} className="text-emerald-700" />
              Gestão de Filiais e Unidades
            </h1>
            <p className="text-xs text-slate-500">
              Cadastre e gerencie CNPJs de filiais operacionais para controle individualizado de dados.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          {showAddForm ? "Fechar Cadastro" : "Cadastrar Nova Filial"}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Add New Branch Collapsible Form */}
      {showAddForm && (
        <form onSubmit={handleAddFilial} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4 animate-slideDown">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Nova Unidade Organizacional</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Nome da Unidade *</label>
              <input
                type="text"
                required
                placeholder="Ex: Rio Branco - Matriz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 block">CNPJ da Filial *</label>
              <input
                type="text"
                required
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={handleCnpjChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Cidade Sede *</label>
              <input
                type="text"
                required
                placeholder="Ex: Rio Branco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Estado *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white focus:border-emerald-500 transition"
              >
                <option value="AC">Acre (AC)</option>
                <option value="AM">Amazonas (AM)</option>
                <option value="RO">Rondônia (RO)</option>
                <option value="PA">Pará (PA)</option>
                <option value="MT">Mato Grosso (MT)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
            >
              Salvar Filial
            </button>
          </div>
        </form>
      )}

      {/* Branches Table List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Pesquisar filial por nome ou CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
            />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Cadastrado: {filiais.length} unidades
          </span>
        </div>

        {filteredFiliais.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-3.5 rounded-full bg-slate-100 text-slate-400">
              <Building2 size={24} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">Nenhuma filial encontrada</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Tente ajustar seus critérios de busca ou cadastre uma nova filial.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3">Unidade Organizacional</th>
                  <th className="px-6 py-3">CNPJ</th>
                  <th className="px-6 py-3">Localização</th>
                  <th className="px-6 py-3">Data Cadastro</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiliais.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/40 transition">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{f.name}</p>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                            ID: {f.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Hash size={12} className="text-slate-400" />
                        <span>{f.cnpj}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{f.city} - {f.state}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-400">
                      {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {f.id === "filial-rb" ? (
                        <span className="text-[10px] font-bold text-slate-400 italic">Matriz</span>
                      ) : (
                        <button
                          onClick={() => handleDelete(f.id, f.name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition hover:scale-105 cursor-pointer"
                          title="Excluir Filial"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-150 rounded-2xl flex items-start gap-3">
        <HelpCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-blue-900">Virtualização de Banco de Dados</h4>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Cada filial cadastrada funciona como uma partição isolada do banco de dados do sistema. Usuários com acesso
            <strong>&quot;Supervisor&quot;</strong> ou <strong>&quot;Operador&quot;</strong> que efetuarem o login naquela filial só conseguirão ver ou incluir rascunhos e auditorias locais da sua filial respectiva. O usuário <strong>&quot;Master&quot;</strong> centraliza o controle geral e visualiza o fluxo consolidado de todas as unidades cooperadas do Acre.
          </p>
        </div>
      </div>
    </div>
  );
}
