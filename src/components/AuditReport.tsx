/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Carregamento } from "../types";
import { 
  Check, Printer, ArrowLeft, Calendar, User, FileText, 
  MapPin, ShieldCheck, Download, AlertCircle, Eye, Play, CheckCircle2, Share2, Trash2, Copy, LogIn 
 } from "lucide-react";
import { encryptId } from "../services/crypto";

// Helper functions to parse percentage/float and angle values from CSS color definitions
function parseL(valStr: string): number {
  const clean = valStr.trim();
  const val = parseFloat(clean);
  if (clean.endsWith('%')) {
    return val / 100;
  }
  if (val > 1) {
    return val / 100;
  }
  return val;
}

function parseChroma(valStr: string): number {
  const clean = valStr.trim();
  const val = parseFloat(clean);
  if (clean.endsWith('%')) {
    return (val / 100) * 0.4;
  }
  return val;
}

function parseH(valStr: string): number {
  const clean = valStr.trim();
  const val = parseFloat(clean);
  if (clean.endsWith('deg')) {
    return val;
  }
  if (clean.endsWith('rad')) {
    return (val * 180) / Math.PI;
  }
  if (clean.endsWith('turn')) {
    return val * 360;
  }
  if (clean.endsWith('%')) {
    return (val / 100) * 360;
  }
  return val;
}

function parseAB(valStr: string): number {
  const clean = valStr.trim();
  const val = parseFloat(clean);
  if (clean.endsWith('%')) {
    return (val / 100) * 0.4;
  }
  return val;
}

// Helper to convert oklch colors to rgb standard format that html2canvas can parse without errors
function replaceOklchInString(cssText: string): string {
  return cssText.replace(/oklch\(([^)]+)\)/gi, (match, innerText) => {
    try {
      let cleanText = innerText.trim();
      let alpha = 1;

      const slashIndex = cleanText.indexOf('/');
      if (slashIndex !== -1) {
        const alphaPart = cleanText.substring(slashIndex + 1).trim();
        if (alphaPart.endsWith('%')) {
          alpha = parseFloat(alphaPart) / 100;
        } else {
          alpha = parseFloat(alphaPart);
        }
        cleanText = cleanText.substring(0, slashIndex).trim();
      }

      const parts = cleanText.split(/[\s,]+/);
      if (parts.length < 3) return match;

      const l = parseL(parts[0]);
      const c = parseChroma(parts[1]);
      const h = parseH(parts[2]);

      if (isNaN(l) || isNaN(c) || isNaN(h)) {
        return match;
      }

      const hRad = (h * Math.PI) / 180;
      const a = c * Math.cos(hRad);
      const b = c * Math.sin(hRad);

      const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

      const l_lms = l_ * l_ * l_;
      const m_lms = m_ * m_ * m_;
      const s_lms = s_ * s_ * s_;

      let r =  4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
      let g = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
      let b_val = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;

      const gamma = (x: number) => {
        return x > 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
      };

      r = Math.max(0, Math.min(1, gamma(r)));
      g = Math.max(0, Math.min(1, gamma(g)));
      b_val = Math.max(0, Math.min(1, gamma(b_val)));

      const r255 = Math.round(r * 255);
      const g255 = Math.round(g * 255);
      const b255 = Math.round(b_val * 255);

      if (alpha !== 1) {
        return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`;
      }
      return `rgb(${r255}, ${g255}, ${b255})`;
    } catch (e) {
      return match;
    }
  });
}

// Helper to convert oklab colors to rgb standard format that html2canvas can parse without errors
function replaceOklabInString(cssText: string): string {
  return cssText.replace(/oklab\(([^)]+)\)/gi, (match, innerText) => {
    try {
      let cleanText = innerText.trim();
      let alpha = 1;

      const slashIndex = cleanText.indexOf('/');
      if (slashIndex !== -1) {
        const alphaPart = cleanText.substring(slashIndex + 1).trim();
        if (alphaPart.endsWith('%')) {
          alpha = parseFloat(alphaPart) / 100;
        } else {
          alpha = parseFloat(alphaPart);
        }
        cleanText = cleanText.substring(0, slashIndex).trim();
      }

      const parts = cleanText.split(/[\s,]+/);
      if (parts.length < 3) return match;

      const l = parseL(parts[0]);
      const a = parseAB(parts[1]);
      const b = parseAB(parts[2]);

      if (isNaN(l) || isNaN(a) || isNaN(b)) {
        return match;
      }

      const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

      const l_lms = l_ * l_ * l_;
      const m_lms = m_ * m_ * m_;
      const s_lms = s_ * s_ * s_;

      let r =  4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
      let g = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
      let b_val = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;

      const gamma = (x: number) => {
        return x > 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
      };

      r = Math.max(0, Math.min(1, gamma(r)));
      g = Math.max(0, Math.min(1, gamma(g)));
      b_val = Math.max(0, Math.min(1, gamma(b_val)));

      const r255 = Math.round(r * 255);
      const g255 = Math.round(g * 255);
      const b255 = Math.round(b_val * 255);

      if (alpha !== 1) {
        return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`;
      }
      return `rgb(${r255}, ${g255}, ${b255})`;
    } catch (e) {
      return match;
    }
  });
}

async function withOklchWorkaround<T>(callback: () => Promise<T>): Promise<T> {
  const originalStylesheets: { element: HTMLStyleElement | HTMLLinkElement; originalDisabled: boolean }[] = [];
  const tempStyleElements: HTMLStyleElement[] = [];
  const originalGetComputedStyle = window.getComputedStyle;

  try {
    // Intercept computed style queries from html2canvas to convert oklch/oklab properties on-the-fly
    window.getComputedStyle = function(element, pseudoElt) {
      const style = originalGetComputedStyle(element, pseudoElt);
      return new Proxy(style, {
        get(target: any, prop: string | symbol) {
          if (prop === "getPropertyValue") {
            return function(propertyName: string) {
              const value = target.getPropertyValue(propertyName);
              if (typeof value === "string" && (value.includes("oklch") || value.includes("oklab") || value.includes("OKLCH") || value.includes("OKLAB"))) {
                return replaceOklabInString(replaceOklchInString(value));
              }
              return value;
            };
          }
          const val = target[prop];
          if (typeof val === "function") {
            return val.bind(target);
          }
          if (typeof val === "string" && (val.includes("oklch") || val.includes("oklab") || val.includes("OKLCH") || val.includes("OKLAB"))) {
            return replaceOklabInString(replaceOklchInString(val));
          }
          return val;
        }
      }) as any;
    };

    const styleSheets = Array.from(document.styleSheets);

    for (let i = 0; i < styleSheets.length; i++) {
      const sheet = styleSheets[i];
      const ownerNode = sheet.ownerNode as HTMLStyleElement | HTMLLinkElement;
      if (!ownerNode) continue;

      originalStylesheets.push({
        element: ownerNode,
        originalDisabled: ownerNode.disabled,
      });

      try {
        let cssText = "";
        
        if (ownerNode.tagName === "STYLE") {
          cssText = ownerNode.textContent || "";
        } else if (ownerNode.tagName === "LINK") {
          try {
            const rules = Array.from(sheet.cssRules || []);
            cssText = rules.map(r => r.cssText).join("\n");
          } catch (ruleErr) {
            const href = (ownerNode as HTMLLinkElement).href;
            if (href) {
              const res = await fetch(href);
              cssText = await res.text();
            }
          }
        }

        if (cssText && (cssText.toLowerCase().includes("oklch") || cssText.toLowerCase().includes("oklab"))) {
          ownerNode.disabled = true;

          const cleanCss = replaceOklabInString(replaceOklchInString(cssText));
          const tempStyle = document.createElement("style");
          tempStyle.setAttribute("data-temp-oklch-fix", "true");
          tempStyle.textContent = cleanCss;
          document.head.appendChild(tempStyle);
          tempStyleElements.push(tempStyle);
        }
      } catch (err) {
        console.warn("Error processing stylesheet for oklch/oklab:", err);
      }
    }

    await new Promise(resolve => requestAnimationFrame(resolve));

    return await callback();
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
    tempStyleElements.forEach(el => el.remove());
    originalStylesheets.forEach(({ element, originalDisabled }) => {
      element.disabled = originalDisabled;
    });
  }
}

interface AuditReportProps {
  carregamento: Carregamento;
  onBack: () => void;
  onDelete?: (id: string) => void;
  isGuest?: boolean;
}

export default function AuditReport({ carregamento, onBack, onDelete, isGuest }: AuditReportProps) {
  const [pdfStatus, setPdfStatus] = React.useState<"idle" | "generating" | "success" | "error">("idle");
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [showIframeWarning, setShowIframeWarning] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  };

  const formatVideoTime = (seconds: number | null) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePrint = () => {
    const isInsideIframe = window.self !== window.top;
    if (isInsideIframe) {
      setShowIframeWarning(true);
      return;
    }

    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
      setShowIframeWarning(true);
    }
  };

  const handleShareWhatsapp = () => {
    const appUrl = window.location.href.split("?")[0];
    const encryptedToken = encryptId(carregamento.id);
    const message = `*COOPERLOG - Relatório de Carga Cooperacre* 🌿🚛\n\n` +
      `*Protocolo:* ${carregamento.protocolo || "Pendente"}\n` +
      `*Unidade/Filial:* ${carregamento.filialName || "Matriz"}\n` +
      `*Status:* Finalizado e Homologado ✅\n\n` +
      `*Motorista:* ${carregamento.motorista}\n` +
      `*Placa Veículo:* ${carregamento.placa}\n` +
      `*Cliente:* ${carregamento.cliente}\n` +
      `*Pedido:* ${carregamento.pedido} | *NF:* ${carregamento.notaFiscal}\n` +
      `*Lacre:* ${carregamento.numeroLacre || "Não informado"}\n\n` +
      `*Acesse a auditoria de evidências completas:* \n${appUrl}?share=${encryptedToken}`;
    
    const encodedText = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
  };

  const handleCopyLink = () => {
    const appUrl = window.location.href.split("?")[0];
    const encryptedToken = encryptId(carregamento.id);
    const shareUrl = `${appUrl}?share=${encryptedToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy link:", err);
    });
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("print_area");
    if (!element) return;

    setPdfStatus("generating");
    setPdfError(null);

    try {
      // Import html2canvas and jsPDF dynamically to ensure clean bundle splitting/speed
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // Force Light Theme for clean printing
      const isDarkMode = document.documentElement.classList.contains("dark");
      if (isDarkMode) {
        document.documentElement.classList.remove("dark");
      }

      // Force standard desktop width
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      element.style.width = "1120px";
      element.style.maxWidth = "1120px";

      // Give a tiny timeout for any rendering updates if needed
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Wrap the rendering in the OKLCH workaround to bypass color parsing errors
      const canvas = await withOklchWorkaround(async () => {
        return await html2canvas(element, {
          scale: 2, // High resolution scale
          useCORS: true, // Handle cross-origin images (e.g., loaded signature, logo)
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1120,
          width: 1120,
          height: element.scrollHeight,
        });
      });

      // Restore original styles and theme immediately
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      }

      const imgData = canvas.toDataURL("image/png");

      // Define A4 dimensions in mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      // Calculate how high the image should be to maintain the aspect ratio
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      // If the image content height exceeds the page height, add subsequent pages
      while (heightLeft > 0) {
        position -= pdfHeight; // Move the Y offset up by exactly one page height
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const fileName = `protocolo_${carregamento.protocolo || "carregamento"}.pdf`;
      pdf.save(fileName);
      setPdfStatus("success");
      
      // Revert status to idle after 3 seconds
      setTimeout(() => setPdfStatus("idle"), 3000);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      setPdfStatus("error");
      setPdfError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:p-0">
      {/* Top action bar (hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 print:hidden transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer animate-fade-in"
          >
            {isGuest ? <LogIn size={15} /> : <ArrowLeft size={16} />}
            {isGuest ? "Acessar CooperLog (Login)" : "Voltar ao Painel"}
          </button>

          {onDelete && (
            <button
              onClick={() => onDelete(carregamento.id)}
              className="flex items-center gap-1.5 text-rose-600 dark:text-rose-450 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold py-1.5 px-3 rounded-lg border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40 transition cursor-pointer"
              title="Apagar Protocolo Permanente"
            >
              <Trash2 size={14} />
              Apagar Protocolo
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {pdfStatus === "error" && (
            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold self-center flex items-center gap-1 max-w-[220px] leading-snug print:hidden animate-fade-in mr-2" title={pdfError || ""}>
              <AlertCircle size={12} className="shrink-0 text-red-500" />
              <span>Erro no PDF. Dica: clique em <strong>Imprimir</strong> e escolha <strong>Salvar como PDF</strong>.</span>
            </span>
          )}

          <button
            onClick={handleExportPDF}
            disabled={pdfStatus === "generating"}
            className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg border transition cursor-pointer print:hidden ${
              pdfStatus === "generating"
                ? "bg-slate-100 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                : pdfStatus === "success"
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white border-slate-900 dark:border-slate-200"
            }`}
          >
            {pdfStatus === "generating" ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
                Gerando...
              </>
            ) : pdfStatus === "success" ? (
              <>
                <Check size={14} className="stroke-[3]" />
                Salvo!
              </>
            ) : (
              <>
                <Download size={14} />
                Exportar PDF
              </>
            )}
          </button>

          <button
            onClick={handleShareWhatsapp}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold py-1.5 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800/40 transition cursor-pointer"
          >
            <Share2 size={14} />
            Enviar WhatsApp
          </button>

          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg border transition cursor-pointer ${
              copied
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Link Copiado!" : "Copiar Link"}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 transition cursor-pointer"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Main Audit Document Paper */}
      <div id="print_area" className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-none print:p-0 p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 text-slate-900 dark:text-slate-100 transition-colors">
        
        {/* Document Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b-2 border-slate-900 dark:border-slate-700 print-border-b">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                COOPERACRE LOGÍSTICA
              </span>
              <span className="bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-mono px-2 py-1 rounded uppercase tracking-wider">
                AUDITORIA INTERNA
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Protocolo de Conformidade de Carga</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              CooperLog - Registro Digital de Evidências Obrigatórias de Expedição
            </p>
          </div>

          {/* Protocol QR & Barcode display */}
          <div className="flex flex-col items-center md:items-end gap-1.5 self-center md:self-start bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl print-bg-gray">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Protocolo de Viagem</p>
            <span className="text-sm font-black text-emerald-800 dark:text-emerald-350 font-mono tracking-wider">
              {carregamento.protocolo}
            </span>
            {/* Visual simulation of QR and barcode */}
            <div className="w-24 h-6 bg-slate-950 flex items-center justify-around rounded border border-slate-800 dark:border-slate-700 p-1 opacity-75 mt-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div 
                  key={i} 
                  className="h-full bg-white" 
                  style={{ width: `${Math.random() > 0.5 ? "2px" : "1px"}` }} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Security / Conformity Badge */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-xl flex items-center gap-3.5 print-bg-success print-no-break">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <ShieldCheck size={22} className="stroke-[2.5]" />
          </div>
          <div className="space-y-0.5 text-left">
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">CARGA COMPLETAMENTE CERTIFICADA</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Todas as evidências obrigatórias e assinaturas eletrônicas foram capturadas e congeladas em <strong>{formatDate(carregamento.finalizedAt)}</strong>. Edição restrita.
            </p>
          </div>
        </div>

        {/* Cargo Metadata Grid */}
        <div className="space-y-4 print-no-break">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-150 dark:border-slate-800 pb-1 text-left print-border-b">
            Informações do Carregamento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm text-left print-grid-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Pedido Associado</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{carregamento.pedido}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Nota Fiscal (NF)</span>
              <p className="font-bold font-mono text-slate-800 dark:text-slate-200">{carregamento.notaFiscal}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Placa do Veículo</span>
              <p className="font-bold"><span className="font-mono bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 border border-yellow-400/30 text-xs font-extrabold px-2 py-0.5 rounded tracking-wider">{carregamento.placa}</span></p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Cliente Destinatário</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{carregamento.cliente}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Transportadora Responsável</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{carregamento.transportadora}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Nome do Motorista</span>
              <p className="font-bold text-slate-800 dark:text-slate-200">{carregamento.motorista}</p>
            </div>
          </div>
        </div>

        {/* Evidences Section: Imagens do Veículo */}
        <div className="space-y-4 print-no-break">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-150 dark:border-slate-800 pb-1 text-left print-border-b">
            Controle do Veículo (Evidências de Carregamento)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left print-grid-2">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-650 dark:text-slate-400">Foto 1: Veículo Sem Carga</span>
              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm relative group">
                {carregamento.fotosAntes.foto1 && !carregamento.fotosAntes.foto1.startsWith("placeholder") ? (
                  <img src={carregamento.fotosAntes.foto1} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-center print-bg-success">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold mt-1 uppercase">Veículo Vazio Homologado</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">Evidência Homologada</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-650 dark:text-slate-400">Foto 2: Veículo Com Carga Total</span>
              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm relative">
                {carregamento.fotosAntes.foto2 && !carregamento.fotosAntes.foto2.startsWith("placeholder") ? (
                  <img src={carregamento.fotosAntes.foto2} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-center print-bg-success">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold mt-1 uppercase">Carga Homologada</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">Evidência Homologada</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Evidences Section: Vídeo de Auditoria */}
        <div className="space-y-4 print-no-break">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-150 dark:border-slate-800 pb-1 text-left print-border-b">
            Vídeo de Auditoria (Processamento e Conferência de Lote)
          </h3>
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-5 justify-between text-left print-bg-gray">
            <div className="flex items-center gap-4 animate-pulse-subtle">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Play size={20} className="fill-red-600 dark:fill-red-400" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-900 dark:text-slate-200 text-sm">Vídeo Integrado de Expedição</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Duração: <strong>{formatVideoTime(carregamento.videoDuration)}</strong> | Registro arquivado para fins de auditoria.
                </p>
              </div>
            </div>

            {carregamento.videoUrl && !carregamento.videoUrl.startsWith("placeholder") ? (
              <>
                <video src={carregamento.videoUrl} controls className="max-h-[100px] aspect-video rounded-lg border border-slate-300 dark:border-slate-700 print:hidden" />
                <span className="hidden print:inline-flex bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide items-center gap-1.5 shrink-0 print-bg-success">
                  <Check size={14} className="stroke-[3]" />
                  ✓ Vídeo Gravado e Arquivado
                </span>
              </>
            ) : (
              <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide flex items-center gap-1.5 shrink-0 print-bg-success">
                <Check size={14} className="stroke-[3]" />
                ✓ Registro de Vídeo Sincronizado
              </span>
            )}
          </div>
        </div>

        {/* Lacres & Security Seals */}
        <div className="space-y-4 print-no-break">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-150 dark:border-slate-800 pb-1 text-left print-border-b">
            Vínculo de Lacre de Segurança (Anti-Violação)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left print-grid-3">
            
            {/* Lacre info column */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 flex flex-col justify-center print-bg-gray">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Número Oficial do Lacre</span>
                <p className="text-lg font-mono font-black text-slate-900 dark:text-white">{carregamento.numeroLacre}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Empresa Responsável</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{carregamento.lacreTransportadora}</p>
              </div>
            </div>

            {/* Photo 1 Lacre Close */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-655 dark:text-slate-400">Foto Aproximada do Lacre</span>
              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm relative">
                {carregamento.fotoLacreAproximada && !carregamento.fotoLacreAproximada.startsWith("placeholder") ? (
                  <img src={carregamento.fotoLacreAproximada} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-center print-bg-success">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold mt-1 uppercase">Lacre Legível</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">Evidência Homologada</span>
                  </div>
                )}
              </div>
            </div>

            {/* Photo 2 Lacre on Truck */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-655 dark:text-slate-400">Foto Instalado no Veículo</span>
              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm relative">
                {carregamento.fotoLacreVeiculo && !carregamento.fotoLacreVeiculo.startsWith("placeholder") ? (
                  <img src={carregamento.fotoLacreVeiculo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/70 dark:bg-emerald-950/20 p-3 text-center print-bg-success">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold mt-1 uppercase">Lacre Instalado</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">Evidência Homologada</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Signatures Panel */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200 dark:border-slate-800 print-no-break print-border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid-2">
            
            {/* Driver Signature Display */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl flex flex-col justify-between items-center gap-4 text-center print-bg-gray">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">ASSINATURA DO MOTORISTA</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{carregamento.motorista}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl w-full max-w-[280px] h-[100px] flex items-center justify-center">
                {carregamento.assinaturaMotorista && !carregamento.assinaturaMotorista.startsWith("placeholder") ? (
                  <img src={carregamento.assinaturaMotorista} alt="Assinatura Motorista" className="max-h-[90px] object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Check className="text-emerald-500" size={20} />
                    <span className="text-[10px] font-bold font-mono text-emerald-750 dark:text-emerald-450">✓ ASSINATURA DIGITAL VALIDADA</span>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Assinado via dispositivo móvel em conformidade</span>
            </div>

            {/* Conferente approval log */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl flex flex-col justify-between items-center gap-4 text-center print-bg-gray">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">HOMOLOGAÇÃO DO CONFERENTE</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{carregamento.conferenteNome || "Operador Cooperacre"}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-5 rounded-xl w-full max-w-[280px] h-[100px] flex flex-col justify-center items-center gap-1">
                <ShieldCheck className="text-emerald-500" size={28} />
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-450 uppercase tracking-wide">OPERADOR VERIFICADO</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Data/Hora: {formatDate(carregamento.conferenteConfirmadoAt)}</span>
              </div>

              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Autenticado com credenciais de expedidor logado</span>
            </div>

          </div>
        </div>

        {/* Legal footprint footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-mono">
          <p>CooperLog Cooperacre • Sistema de Rastreabilidade e Auditoria de Expedições</p>
        </div>

      </div>

      {/* Iframe Print Warning Modal */}
      {showIframeWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 space-y-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full shrink-0">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Impressão Bloqueada pelo Navegador
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Como o aplicativo está rodando dentro do painel do <strong>Google AI Studio</strong> (ambiente de desenvolvimento embutido), o navegador impede o recurso de impressão direta por segurança.
                </p>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs space-y-1 text-slate-600 dark:text-slate-350">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Escolha uma das soluções abaixo:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Solução 1:</strong> Clique em &quot;Abrir em Nova Aba&quot; e utilize o botão Imprimir lá.</li>
                    <li><strong>Solução 2:</strong> Use o botão &quot;Exportar PDF&quot; para fazer o download direto.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowIframeWarning(false)}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm text-sm transition text-center cursor-pointer"
              >
                <Printer size={16} />
                Abrir em Nova Aba & Imprimir
              </a>
              <button
                onClick={() => setShowIframeWarning(false)}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
