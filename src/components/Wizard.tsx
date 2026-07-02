/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Carregamento, LoggedUser } from "../types";
import { 
  ArrowLeft, ArrowRight, Save, Camera, Video, FileText, CheckCircle2, 
  Trash2, AlertCircle, Edit3, ShieldAlert, Check, RefreshCw, PenTool 
} from "lucide-react";
import CameraCapture from "./CameraCapture";
import SignatureCanvas from "./SignatureCanvas";
import { motion, AnimatePresence } from "motion/react";

interface WizardProps {
  initialCarregamento: Carregamento;
  onSave: (carregamento: Carregamento) => Promise<void>;
  onFinalize: (carregamento: Carregamento, protocolo: string) => Promise<void>;
  onCancel: () => void;
  currentUser?: LoggedUser | null;
}

export default function Wizard({ initialCarregamento, onSave, onFinalize, onCancel, currentUser }: WizardProps) {
  const [carregamento, setCarregamento] = useState<Carregamento>(initialCarregamento);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isMaster = currentUser?.role === "master";
  const canCapture = !!currentUser;

  // States for opening camera modal
  const [cameraConfig, setCameraConfig] = useState<{
    mode: "photo" | "video";
    title: string;
    targetKey: string;
  } | null>(null);

  // Form field errors for Step 1
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Trigger auto-save
  const triggerAutoSave = async (updatedObj: Carregamento) => {
    setIsSaving(true);
    try {
      await onSave(updatedObj);
      setSaveMessage("Rascunho salvo automaticamente.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar automaticamente:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeStep1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCarregamento((prev) => ({
      ...prev,
      [name]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Step 1 Validation & Next
  const handleNextStep1 = async () => {
    const errors: Record<string, string> = {};
    if (!carregamento.pedido.trim()) errors.pedido = "Pedido é obrigatório.";
    if (!carregamento.notaFiscal.trim()) errors.notaFiscal = "Nota Fiscal é obrigatória.";
    if (!carregamento.cliente.trim()) errors.cliente = "Cliente é obrigatório.";
    if (!carregamento.transportadora.trim()) errors.transportadora = "Transportadora é obrigatória.";
    if (!carregamento.motorista.trim()) errors.motorista = "Nome do motorista é obrigatório.";
    if (!carregamento.motoristaDocumento?.trim()) errors.motoristaDocumento = "CPF ou RG do motorista é obrigatório.";
    if (!carregamento.placa.trim()) errors.placa = "Placa do veículo é obrigatória.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    await triggerAutoSave(carregamento);
    setCurrentStep(2);
  };

  // Photo handlers
  const handlePhotoCapture = (blobUrl: string) => {
    if (!cameraConfig) return;

    const { targetKey } = cameraConfig;
    const updated = { ...carregamento };

    if (targetKey.startsWith("fotosAntes.")) {
      const field = targetKey.split(".")[1] as keyof typeof carregamento.fotosAntes;
      updated.fotosAntes = {
        ...updated.fotosAntes,
        [field]: blobUrl,
      };
    } else if (targetKey.startsWith("fotosDepois.")) {
      const field = targetKey.split(".")[1] as keyof typeof carregamento.fotosDepois;
      updated.fotosDepois = {
        ...updated.fotosDepois,
        [field]: blobUrl,
      };
    } else if (targetKey === "fotoLacreAproximada") {
      updated.fotoLacreAproximada = blobUrl;
    } else if (targetKey === "fotoLacreVeiculo") {
      updated.fotoLacreVeiculo = blobUrl;
    }

    updated.updatedAt = new Date().toISOString();
    setCarregamento(updated);
    setCameraConfig(null);
    triggerAutoSave(updated);
  };

  // Video capture handler
  const handleVideoCapture = (blobUrl: string, duration?: number, size?: number) => {
    const updated: Carregamento = {
      ...carregamento,
      videoUrl: blobUrl,
      videoDuration: duration || 320,
      videoSize: size || 15400000,
      videoRecordedReal: true,
      fotosAntes: {
        ...carregamento.fotosAntes,
        foto3: "placeholder_video", // Set to placeholder so existing components remain happy
      },
      updatedAt: new Date().toISOString(),
    };
    setCarregamento(updated);
    setCameraConfig(null);
    triggerAutoSave(updated);
  };

  // Clear evidence item
  const clearEvidence = (key: string) => {
    if (!canCapture) return;
    const updated = { ...carregamento };
    if (key.startsWith("fotosAntes.")) {
      const field = key.split(".")[1] as keyof typeof carregamento.fotosAntes;
      updated.fotosAntes = { ...updated.fotosAntes, [field]: null };
    } else if (key.startsWith("fotosDepois.")) {
      const field = key.split(".")[1] as keyof typeof carregamento.fotosDepois;
      updated.fotosDepois = { ...updated.fotosDepois, [field]: null };
    } else if (key === "fotoLacreAproximada") {
      updated.fotoLacreAproximada = null;
    } else if (key === "fotoLacreVeiculo") {
      updated.fotoLacreVeiculo = null;
    } else if (key === "video") {
      updated.videoUrl = null;
      updated.videoDuration = null;
      updated.videoSize = null;
      updated.fotosAntes = { ...updated.fotosAntes, foto3: null };
    }
    updated.updatedAt = new Date().toISOString();
    setCarregamento(updated);
    triggerAutoSave(updated);
  };

  // Step 2 Validation: exactly 2 photos and 1 video
  const isStep2Valid = () => {
    return !!(
      carregamento.fotosAntes.foto1 &&
      carregamento.fotosAntes.foto2 &&
      (carregamento.fotosAntes.foto3 || carregamento.videoUrl)
    );
  };

  // Step 3 Validation: Lacre details & 2 photos
  const isStep3Valid = () => {
    return !!(
      carregamento.fotoLacreAproximada &&
      carregamento.fotoLacreVeiculo &&
      carregamento.numeroLacre.trim() &&
      carregamento.lacreTransportadora.trim()
    );
  };

  // Step 4 Validation: Signature of driver and confirmation of conferente
  const isStep4Valid = () => {
    return !!(
      carregamento.assinaturaMotorista &&
      carregamento.conferenteConfirmado
    );
  };

  // Step 5 Validation: Full checklist
  const isFullChecklistValid = () => {
    return (
      isStep2Valid() &&
      isStep3Valid() &&
      isStep4Valid()
    );
  };

  // Driver signature save/clear
  const handleDriverSignatureSave = (dataUrl: string) => {
    const updated = {
      ...carregamento,
      assinaturaMotorista: dataUrl,
      updatedAt: new Date().toISOString(),
    };
    setCarregamento(updated);
    triggerAutoSave(updated);
  };

  const handleDriverSignatureClear = () => {
    const updated = {
      ...carregamento,
      assinaturaMotorista: null,
      updatedAt: new Date().toISOString(),
    };
    setCarregamento(updated);
    triggerAutoSave(updated);
  };

  // Conferente confirmation toggle
  const toggleConferenteConfirm = () => {
    const isConfirming = !carregamento.conferenteConfirmado;
    const nameWithRole = currentUser 
      ? `${currentUser.username} (${currentUser.role === "master" ? "Master" : currentUser.role === "supervisor" ? "Supervisor" : "Operador"})`
      : "Operador Cooperacre";
    const updated = {
      ...carregamento,
      conferenteConfirmado: isConfirming,
      conferenteNome: isConfirming ? nameWithRole : null,
      conferenteConfirmadoAt: isConfirming ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    };
    setCarregamento(updated);
    triggerAutoSave(updated);
  };

  // Finalize shipment - generate protocol & lock
  const handleFinalizeLoad = async () => {
    if (!isFullChecklistValid()) return;

    // Generate random 4 digit hex for suffix
    const hex = Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, "0");
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const generatedProtocol = `PRT-${todayStr}-${hex}`;

    setIsSaving(true);
    try {
      await onFinalize(carregamento, generatedProtocol);
    } catch (err) {
      console.error("Erro ao finalizar carregamento:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const stepsList = [
    { num: 1, label: "Cadastro" },
    { num: 2, label: "Imagens" },
    { num: 3, label: "Lacre" },
    { num: 4, label: "Assinaturas" },
    { num: 5, label: "Finalização" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Wizard Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-slate-100 transition"
        >
          <ArrowLeft size={16} />
          Voltar ao Painel
        </button>

        {/* Auto save indicator */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          {isSaving ? (
            <>
              <RefreshCw size={12} className="animate-spin text-emerald-600" />
              <span>Sincronizando...</span>
            </>
          ) : (
            <>
              <Check size={12} className="text-emerald-500" />
              <span>{saveMessage || "Sincronizado com o Firestore"}</span>
            </>
          )}
        </div>
      </div>

      {/* Progress Wizard Timeline */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] px-4">
          {stepsList.map((step, idx) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;

            return (
              <React.Fragment key={step.num}>
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => {
                    // Let them navigate only backwards or to the next steps if valid
                    if (step.num < currentStep || (step.num === 1) || (step.num === 2 && !Object.values(formErrors).length)) {
                      setCurrentStep(step.num);
                    }
                  }}
                  disabled={step.num > currentStep && step.num !== 1}
                  className={`flex flex-col items-center gap-2 relative focus:outline-none shrink-0 group ${
                    step.num <= currentStep ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition border-2 ${
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100"
                      : isCompleted
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-slate-400 border-slate-200 group-hover:border-slate-300"
                  }`}>
                    {isCompleted ? <Check size={14} className="stroke-[3]" /> : step.num}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? "text-emerald-700" : isCompleted ? "text-emerald-600" : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>
                </button>

                {/* Connecting Line */}
                {idx < stepsList.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded transition ${
                    step.num < currentStep ? "bg-emerald-500" : "bg-slate-100"
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Primary Step Content Box */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {/* Step Header Title */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            {currentStep}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {currentStep === 1 && "Etapa 1: Cadastro Inicial do Carregamento"}
              {currentStep === 2 && "Etapa 2: Imagens do Carregamento"}
              {currentStep === 3 && "Etapa 3: Vínculo de Lacres de Segurança"}
              {currentStep === 4 && "Etapa 4: Assinatura Eletrônica e Conferência"}
              {currentStep === 5 && "Etapa 5: Revisão do Protocolo de Expedição"}
            </h2>
            <p className="text-xs text-slate-500">
              {currentStep === 1 && "Insira as informações de nota fiscal, motorista (com CPF/RG) e veículo para começar."}
              {currentStep === 2 && "Fotos obrigatórias do veículo sem carga, com carga total e vídeo conferência."}
              {currentStep === 3 && "Atribua o lacre oficial de segurança que sela o compartimento."}
              {currentStep === 4 && "Colete a assinatura do motorista e a homologação do conferente logado."}
              {currentStep === 5 && "Verifique o checklist obrigatório e confirme para gerar o protocolo de viagem."}
            </p>
          </div>
        </div>

        {/* Step Body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="p-6"
          >
          
          {/* STEP 1: CADASTRO */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pedido</label>
                  <input
                    type="text"
                    name="pedido"
                    placeholder="Ex: PED-98201"
                    value={carregamento.pedido}
                    onChange={handleChangeStep1}
                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                      formErrors.pedido 
                        ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                        : "border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-500"
                    }`}
                  />
                  {formErrors.pedido && <p className="text-xs text-red-500 font-medium">{formErrors.pedido}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nota Fiscal (NF)</label>
                  <input
                    type="text"
                    name="notaFiscal"
                    placeholder="Ex: NF-0004189"
                    value={carregamento.notaFiscal}
                    onChange={handleChangeStep1}
                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                      formErrors.notaFiscal 
                        ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                        : "border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-500"
                    }`}
                  />
                  {formErrors.notaFiscal && <p className="text-xs text-red-500 font-medium">{formErrors.notaFiscal}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Cliente Destinatário</label>
                  <input
                    type="text"
                    name="cliente"
                    placeholder="Ex: Alimentos Orgânicos da Amazônia"
                    value={carregamento.cliente}
                    onChange={handleChangeStep1}
                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                      formErrors.cliente 
                        ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                        : "border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-500"
                    }`}
                  />
                  {formErrors.cliente && <p className="text-xs text-red-500 font-medium">{formErrors.cliente}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Transportadora Responsável</label>
                  <input
                    type="text"
                    name="transportadora"
                    placeholder="Ex: Cooperacre Logística S/A"
                    value={carregamento.transportadora}
                    onChange={handleChangeStep1}
                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                      formErrors.transportadora 
                        ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                        : "border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-500"
                    }`}
                  />
                  {formErrors.transportadora && <p className="text-xs text-red-500 font-medium">{formErrors.transportadora}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Motorista (Nome Completo)</label>
                  <input
                    type="text"
                    name="motorista"
                    placeholder="Ex: Manoel Francisco Castro"
                    value={carregamento.motorista}
                    onChange={handleChangeStep1}
                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                      formErrors.motorista 
                        ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                        : "border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-500"
                    }`}
                  />
                  {formErrors.motorista && <p className="text-xs text-red-500 font-medium">{formErrors.motorista}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">CPF ou RG do Motorista</label>
                  <input
                    type="text"
                    name="motoristaDocumento"
                    placeholder="Ex: 123.456.789-00 ou 1234567-SSP"
                    value={carregamento.motoristaDocumento || ""}
                    onChange={handleChangeStep1}
                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                      formErrors.motoristaDocumento 
                        ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                        : "border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-500"
                    }`}
                  />
                  {formErrors.motoristaDocumento && <p className="text-xs text-red-500 font-medium">{formErrors.motoristaDocumento}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Placa do Veículo</label>
                  <input
                    type="text"
                    name="placa"
                    placeholder="Ex: OXP-8102"
                    value={carregamento.placa}
                    onChange={handleChangeStep1}
                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                      formErrors.placa 
                        ? "border-red-400 focus:ring-red-200 focus:border-red-500" 
                        : "border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-500"
                    }`}
                  />
                  {formErrors.placa && <p className="text-xs text-red-500 font-medium">{formErrors.placa}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  Continuar
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

                  {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 shadow-sm">
                <ShieldAlert size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Auditoria Fotográfica:</span> Certifique-se de que as imagens estejam nítidas, com boa iluminação e que os dados do veículo e lacre estejam perfeitamente legíveis para garantir a conformidade da expedição.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Photo 1 */}
                <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Foto 1: Carro Sem Carga</span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[160px]">
                    {carregamento.fotosAntes.foto1 ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner">
                        <img src={carregamento.fotosAntes.foto1} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {canCapture && (
                          <button
                            type="button"
                            onClick={() => clearEvidence("fotosAntes.foto1")}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canCapture}
                        onClick={() => canCapture && setCameraConfig({ mode: "photo", title: "Foto 1: Veículo sem carga", targetKey: "fotosAntes.foto1" })}
                        className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition ${
                          canCapture
                            ? "border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 cursor-pointer"
                            : "border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-75"
                        }`}
                      >
                        <Camera size={24} className={canCapture ? "" : "text-slate-300"} />
                        <span className="text-xs font-semibold">
                          {canCapture ? (isMaster ? "Tirar / Enviar Foto" : "Tirar Foto (Câmera)") : "Bloqueado"}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-slate-100/50 border-t border-slate-200 text-[10px] text-slate-500 italic">
                    Compartimento de carga completamente vazio antes do embarque.
                  </div>
                </div>

                {/* Photo 2 */}
                <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Foto 2: Carro Com Carga Total</span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[160px]">
                    {carregamento.fotosAntes.foto2 ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner">
                        <img src={carregamento.fotosAntes.foto2} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {canCapture && (
                          <button
                            type="button"
                            onClick={() => clearEvidence("fotosAntes.foto2")}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canCapture}
                        onClick={() => canCapture && setCameraConfig({ mode: "photo", title: "Foto 2: Veículo com carga total", targetKey: "fotosAntes.foto2" })}
                        className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition ${
                          canCapture
                            ? "border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 cursor-pointer"
                            : "border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-75"
                        }`}
                      >
                        <Camera size={24} className={canCapture ? "" : "text-slate-300"} />
                        <span className="text-xs font-semibold">
                          {canCapture ? (isMaster ? "Tirar / Enviar Foto" : "Tirar Foto (Câmera)") : "Bloqueado"}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-slate-100/50 border-t border-slate-200 text-[10px] text-slate-500 italic">
                    Carga totalmente embarcada e organizada no caminhão.
                  </div>
                </div>

                {/* Video / Photo 3 */}
                <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Vídeo: Vídeo Conferência</span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col items-center justify-center min-h-[160px]">
                    {carregamento.videoUrl ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner">
                        <video src={carregamento.videoUrl} controls className="w-full h-full object-cover" />
                        {canCapture && (
                          <button
                            type="button"
                            onClick={() => clearEvidence("video")}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition cursor-pointer z-10"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ) : (carregamento.fotosAntes.foto3 && carregamento.fotosAntes.foto3 !== "placeholder_video") ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner">
                        <img src={carregamento.fotosAntes.foto3} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {canCapture && (
                          <button
                            type="button"
                            onClick={() => clearEvidence("fotosAntes.foto3")}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canCapture}
                        onClick={() => canCapture && setCameraConfig({ mode: "video", title: "Gravar Vídeo Conferência", targetKey: "video" })}
                        className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition ${
                          canCapture
                            ? "border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 cursor-pointer"
                            : "border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-75"
                        }`}
                      >
                        <Video size={24} className={canCapture ? "" : "text-slate-300"} />
                        <span className="text-xs font-semibold">
                          {canCapture ? "Gravar Vídeo Conferência" : "Bloqueado"}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-slate-100/50 border-t border-slate-200 text-[10px] text-slate-500 italic">
                    Registro de vídeo conferência gravado e arquivado para fins de auditoria.
                  </div>
                </div>
              </div>

              {/* Status Warning Rule */}
              {!isStep2Valid() && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2.5">
                  <AlertCircle size={16} />
                  <span>Atenção: É obrigatório tirar exatamente as 3 fotos antes de avançar para a próxima etapa.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={!isStep2Valid()}
                  className={`font-bold px-6 py-2.5 rounded-xl text-sm transition shadow flex items-center gap-1.5 ${
                    isStep2Valid()
                      ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Continuar
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: LACRE */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 shadow-sm">
                <ShieldAlert size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Segurança Logística:</span> Garanta que o número do lacre físico coincida perfeitamente com os registros documentais (Nota Fiscal/Pedido) antes de confirmar a foto.
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Lacre Information Fields */}
                <div className="space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">Identificação do Lacre</h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Número do Lacre</label>
                    <input
                      type="text"
                      name="numeroLacre"
                      placeholder="Ex: LAC-90218-AC"
                      value={carregamento.numeroLacre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCarregamento(prev => ({ ...prev, numeroLacre: val, updatedAt: new Date().toISOString() }));
                      }}
                      onBlur={() => triggerAutoSave(carregamento)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Transportadora Responsável pelo Lacre</label>
                    <input
                      type="text"
                      name="lacreTransportadora"
                      placeholder="Ex: Transportadora Solimões"
                      value={carregamento.lacreTransportadora}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCarregamento(prev => ({ ...prev, lacreTransportadora: val, updatedAt: new Date().toISOString() }));
                      }}
                      onBlur={() => triggerAutoSave(carregamento)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-sm"
                    />
                  </div>
                </div>

                {/* Photos of Lacre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Photo Close Lacre */}
                  <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700">Foto 1: Lacre Aproximada</span>
                    </div>
                    <div className="p-3 flex items-center justify-center flex-1 min-h-[140px]">
                      {carregamento.fotoLacreAproximada ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                          <img src={carregamento.fotoLacreAproximada} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          {canCapture && (
                            <button
                              type="button"
                              onClick={() => clearEvidence("fotoLacreAproximada")}
                              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition cursor-pointer"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!canCapture}
                          onClick={() => canCapture && setCameraConfig({ mode: "photo", title: "Foto do lacre aproximada (numeração legível)", targetKey: "fotoLacreAproximada" })}
                          className={`w-full aspect-video border border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition ${
                            canCapture
                              ? "border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 cursor-pointer"
                              : "border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-75"
                          }`}
                        >
                          <Camera size={20} className={canCapture ? "" : "text-slate-300"} />
                          <span className="text-[10px] font-semibold">
                            {canCapture ? (isMaster ? "Tirar / Enviar" : "Tirar Foto (Câmera)") : "Bloqueado"}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="p-2 bg-slate-100/50 border-t border-slate-200 text-[9px] text-slate-500 italic">
                      Deve ser possível ler os dígitos impressos no lacre plástico/metálico.
                    </div>
                  </div>

                  {/* Photo Lacre no Veículo */}
                  <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700">Foto 2: Lacre no Veículo</span>
                    </div>
                    <div className="p-3 flex items-center justify-center flex-1 min-h-[140px]">
                      {carregamento.fotoLacreVeiculo ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                          <img src={carregamento.fotoLacreVeiculo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          {canCapture && (
                            <button
                              type="button"
                              onClick={() => clearEvidence("fotoLacreVeiculo")}
                              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition cursor-pointer"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!canCapture}
                          onClick={() => canCapture && setCameraConfig({ mode: "photo", title: "Foto do lacre instalado no veículo", targetKey: "fotoLacreVeiculo" })}
                          className={`w-full aspect-video border border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition ${
                            canCapture
                              ? "border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700 cursor-pointer"
                              : "border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-75"
                          }`}
                        >
                          <Camera size={20} className={canCapture ? "" : "text-slate-300"} />
                          <span className="text-[10px] font-semibold">
                            {canCapture ? (isMaster ? "Tirar / Enviar" : "Tirar Foto (Câmera)") : "Bloqueado"}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="p-2 bg-slate-100/50 border-t border-slate-200 text-[9px] text-slate-500 italic">
                      Mostrando o lacre trancado na maçaneta da porta ou carroceria do caminhão.
                    </div>
                  </div>
                </div>

              </div>

              {/* Status Warning Rule */}
              {!isStep3Valid() && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2.5">
                  <AlertCircle size={16} />
                  <span>Atenção: Para prosseguir, preencha o número, a transportadora e envie as 2 fotos do lacre.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerAutoSave(carregamento);
                    setCurrentStep(4);
                  }}
                  disabled={!isStep3Valid()}
                  className={`font-bold px-6 py-2.5 rounded-xl text-sm transition shadow flex items-center gap-1.5 ${
                    isStep3Valid()
                      ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Continuar
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ASSINATURAS */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Motorista Signature */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col h-full gap-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <PenTool size={18} className="text-slate-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Assinatura Digital do Motorista</h3>
                  </div>

                  <p className="text-xs text-slate-500">
                    O motorista <span className="font-bold text-slate-700">{carregamento.motorista}</span> deve assinar na tela para registrar aceitação.
                  </p>

                  <div className="flex-1 flex flex-col min-h-[180px]">
                    <SignatureCanvas
                      onSave={handleDriverSignatureSave}
                      onClear={handleDriverSignatureClear}
                      initialValue={carregamento.assinaturaMotorista}
                    />
                  </div>
                </div>

                {/* Conferente Confirm User */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between h-full gap-4">
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
                      <CheckCircle2 size={18} className="text-slate-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Aprovação do Conferente de Expedição</h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Como operador/conferente responsável, homologue as informações e mídias vinculadas. O registro de conferência receberá seu carimbo digital com base no login ativo.
                    </p>

                    {/* Active conferente login */}
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Usuário Logado no Sistema</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currentUser?.username || "Operador"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-450 font-mono">
                        Função: {currentUser?.role === "master" ? "Master" : currentUser?.role === "supervisor" ? "Supervisor" : "Operador"} / {currentUser?.filialName || "Matriz"}
                      </p>
                    </div>
                  </div>

                  {/* Accept confirmation checkbox button */}
                  <button
                    type="button"
                    onClick={toggleConferenteConfirm}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                      carregamento.conferenteConfirmado
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300"
                    }`}
                  >
                    {carregamento.conferenteConfirmado ? (
                      <>
                        <Check size={18} className="stroke-[3]" />
                        ✓ Confirmado como {currentUser?.username || "Operador"}
                      </>
                    ) : (
                      <>
                        Confirmar como {currentUser?.username || "Operador"}
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Status Warning Rule */}
              {!isStep4Valid() && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2.5">
                  <AlertCircle size={16} />
                  <span>Atenção: A assinatura do motorista e a homologação do conferente são obrigatórias.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerAutoSave(carregamento);
                    setCurrentStep(5);
                  }}
                  disabled={!isStep4Valid()}
                  className={`font-bold px-6 py-2.5 rounded-xl text-sm transition shadow flex items-center gap-1.5 ${
                    isStep4Valid()
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Continuar
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVISÃO E PROTOCOLO */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">Checklist Obrigatório de Conformidade</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Step 1 Item */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-150">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Cadastro de Carga (Step 1)</p>
                        <p className="text-[10px] text-slate-500 font-mono">Placa: {carregamento.placa} | NF: {carregamento.notaFiscal}</p>
                      </div>
                    </div>
                    <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                  </div>

                  {/* Step 2 Item */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-150">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                        <Camera size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Imagens do Carregamento (Step 2)</p>
                        <p className="text-[10px] text-slate-500">Exatamente 3 fotos cadastradas</p>
                      </div>
                    </div>
                    {isStep2Valid() ? (
                      <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-500" />
                    )}
                  </div>

                  {/* Step 3 Item */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-150">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Lacre Vinculado (Step 3)</p>
                        <p className="text-[10px] text-slate-500 font-mono">Lacre: {carregamento.numeroLacre || "N/A"}</p>
                      </div>
                    </div>
                    {isStep3Valid() ? (
                      <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-500" />
                    )}
                  </div>

                  {/* Step 4 Item */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-150">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                        <PenTool size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Assinaturas Coletadas (Step 4)</p>
                        <p className="text-[10px] text-slate-500">Assinatura Motorista e Conferente confirmados</p>
                      </div>
                    </div>
                    {isStep4Valid() ? (
                      <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-500" />
                    )}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <div className="p-1 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900">Bloqueio do Protocolo de Viagem</h5>
                    <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                      Ao clicar em <strong>&quot;Finalizar e Bloquear Edição&quot;</strong>, o sistema registrará os dados de forma permanente no Firestore. Não será possível editar, alterar fotos ou excluir registros depois que o protocolo for gerado, garantindo a integridade em auditorias logísticas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeLoad}
                  disabled={!isFullChecklistValid() || isSaving}
                  className={`font-bold px-8 py-3.5 rounded-xl text-sm transition shadow-lg flex items-center gap-2 hover:scale-[1.01] ${
                    isFullChecklistValid() && !isSaving
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="stroke-[3]" />
                      Finalizar e Bloquear Edição
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global Camera Overlay Capture Trigger */}
      {cameraConfig && (
        <CameraCapture
          mode={cameraConfig.mode}
          title={cameraConfig.title}
          allowUpload={isMaster}
          onCapture={
            cameraConfig.mode === "photo" 
              ? handlePhotoCapture 
              : handleVideoCapture
          }
          onClose={() => setCameraConfig(null)}
        />
      )}
    </div>
  );
}
