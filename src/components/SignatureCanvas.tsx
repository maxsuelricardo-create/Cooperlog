/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Trash2, Check, PenTool } from "lucide-react";

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  initialValue: string | null;
  readOnly?: boolean;
}

export default function SignatureCanvas({ onSave, onClear, initialValue, readOnly = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSigned, setHasSigned] = useState<boolean>(!!initialValue);

  useEffect(() => {
    if (initialValue && canvasRef.current) {
      loadSavedSignature(initialValue);
    }
  }, [initialValue]);

  const setupContextStyles = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#0f172a"; // slate-900
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  // Adjust canvas resolution for high-DPI screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Draw initial value back if it existed
      if (initialValue) {
        loadSavedSignature(initialValue);
      } else {
        setupContextStyles(ctx);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const loadSavedSignature = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasSigned(true);
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setupContextStyles(ctx);
    setIsDrawing(true);
    const coords = getEventCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Prevent scrolling on touch devices while signing
    if (e.cancelable) {
      e.preventDefault();
    }

    const coords = getEventCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    saveSignature();
  };

  const getEventCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupContextStyles(ctx);
    setHasSigned(false);
    onClear();
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 min-h-[160px] flex-1">
        {readOnly && initialValue ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 p-2 min-h-[160px]">
            <img
              src={initialValue}
              alt="Assinatura"
              className="max-h-[150px] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`w-full h-full block cursor-crosshair min-h-[160px] ${
                readOnly ? "pointer-events-none" : ""
              }`}
            />

            {!hasSigned && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none text-slate-400">
                <PenTool size={24} className="animate-pulse" />
                <span className="text-xs font-medium">Assine aqui usando o dedo ou mouse</span>
              </div>
            )}

            {hasSigned && !readOnly && (
              <button
                type="button"
                onClick={clearCanvas}
                className="absolute bottom-3 right-3 p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition shadow-sm flex items-center gap-1.5 text-xs font-semibold"
              >
                <Trash2 size={14} />
                Limpar
              </button>
            )}
          </>
        )}
      </div>

      {!readOnly && (
        <div className="text-[11px] text-slate-500 italic flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Assinatura digitalizada e vinculada ao protocolo com carimbo de data/hora (UTC).</span>
        </div>
      )}
    </div>
  );
}
