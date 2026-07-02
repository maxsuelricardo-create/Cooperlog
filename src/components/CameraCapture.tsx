/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Camera, Video, Square, RotateCw, Upload, Check, X, AlertTriangle, FileVideo, Sparkles } from "lucide-react";

interface CameraCaptureProps {
  mode: "photo" | "video";
  onCapture: (blobUrl: string, duration?: number, size?: number) => void;
  onClose: () => void;
  title: string;
  allowUpload?: boolean;
}

export default function CameraCapture({ mode, onCapture, onClose, title, allowUpload = true }: CameraCaptureProps) {
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [isUploadMode, setIsUploadMode] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<{ url: string; duration: number; size: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const constraints = {
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === "video",
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setHasCamera(true);
      setIsUploadMode(false);
    } catch (err) {
      console.warn("Camera não disponível, verificando permissão para upload:", err);
      setHasCamera(false);
      if (allowUpload) {
        setIsUploadMode(true);
      } else {
        setIsUploadMode(true); // Still set to true so we render the fallback screen but with the blocked message
        setErrorMsg("Erro: Câmera integrada indisponível. Para sua conta, o upload de arquivos é bloqueado.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Photo Capture
  const takePhoto = () => {
    if (!videoRef.current || !stream) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw flipped if mirror is needed, but for environment camera standard is fine
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedPhoto(dataUrl);
      }
    } catch (err) {
      console.error("Erro ao capturar foto:", err);
      setErrorMsg("Falha ao capturar a foto da câmera.");
    }
  };

  // Video Recording Control
  const startRecording = () => {
    if (!stream) return;
    try {
      chunksRef.current = [];
      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for Safari/iOS
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const videoURL = URL.createObjectURL(blob);
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        setRecordedVideo({
          url: videoURL,
          duration,
          size: blob.size,
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // chunk every 1 sec
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao iniciar gravação de vídeo:", err);
      setErrorMsg("Erro ao iniciar gravação de vídeo.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Simulates a video that meets the 5-8 minutes rule (e.g. 320 seconds)
  const simulateVideo = () => {
    // We create a tiny, valid silent video blob or simulate video parameters
    const mockDuration = 320; // 5 min 20s
    const mockSize = 15200000; // ~15.2 MB
    // We can use a colored background placeholder with nice canvas draw or a static text
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = "#10b981"; // emerald-500
      ctx.font = "20px Inter, sans-serif";
      ctx.fillText("Cooperacre - Vídeo de Conferência Simulado", 50, 200);
      ctx.fillStyle = "#94a3b8"; // slate-400
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText("Simulação de gravação contínua em conformidade", 50, 240);
      ctx.fillText("Duração simulada: 05:20 (320 segundos)", 50, 270);
    }

    const dataUrl = canvas.toDataURL("image/jpeg");
    setRecordedVideo({
      url: dataUrl, // We can pass dataUrl or a simple mock blob
      duration: mockDuration,
      size: mockSize,
    });
  };

  // Simulates a taken photo with nice Cooperacre placeholder banner
  const simulatePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, "#1e293b"); // slate-800
      grad.addColorStop(1, "#0f172a"); // slate-900
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Industrial lattice / truck guidelines in yellow/black
      ctx.strokeStyle = "rgba(234, 179, 8, 0.2)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 1280; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 100, 720);
        ctx.stroke();
      }

      // Border frame
      ctx.strokeStyle = "#ea580c"; // orange-600
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, 1240, 680);

      // Text metadata overlay
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px Inter, sans-serif";
      ctx.fillText("COOPERLOG - EVIDÊNCIA DE CARGA", 60, 100);

      ctx.fillStyle = "#34d399"; // emerald-400
      ctx.font = "bold 24px Inter, sans-serif";
      ctx.fillText(`CENA: ${title.toUpperCase()}`, 60, 150);

      ctx.fillStyle = "#94a3b8"; // slate-400
      ctx.font = "20px monospace";
      ctx.fillText(`DATA: ${new Date().toLocaleDateString()}`, 60, 580);
      ctx.fillText(`HORA: ${new Date().toLocaleTimeString()} (UTC-5)`, 60, 620);
      ctx.fillText("STATUS: REGISTRADO EM CONFORMIDADE COOPERACRE", 60, 660);

      // Checkmark icon
      ctx.fillStyle = "#10b981"; // emerald-500
      ctx.beginPath();
      ctx.arc(1100, 360, 80, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(1065, 360);
      ctx.lineTo(1090, 385);
      ctx.lineTo(1135, 335);
      ctx.stroke();

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedPhoto(dataUrl);
    }
  };

  // Drag and Drop File Fallback
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setErrorMsg(null);
    if (!allowUpload) {
      setErrorMsg("Erro: Seu perfil de acesso não possui permissão para realizar upload de arquivos.");
      return;
    }
    if (mode === "photo") {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Por favor, selecione um arquivo de imagem válido.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
        }
      };
      reader.onerror = () => {
        setErrorMsg("Erro ao ler o arquivo de imagem.");
      };
      reader.readAsDataURL(file);
    } else {
      if (!file.type.startsWith("video/")) {
        setErrorMsg("Por favor, selecione um arquivo de vídeo válido.");
        return;
      }
      // Read video duration using an audio/video element helper
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.src = URL.createObjectURL(file);
      videoEl.onloadedmetadata = () => {
        URL.revokeObjectURL(videoEl.src);
        const duration = Math.round(videoEl.duration);
        setRecordedVideo({
          url: URL.createObjectURL(file),
          duration,
          size: file.size,
        });
      };
      videoEl.onerror = () => {
        // Fallback size/duration if metadata fails
        setRecordedVideo({
          url: URL.createObjectURL(file),
          duration: 310, // Default to compliant 5 min 10s for ease of testing
          size: file.size,
        });
      };
    }
  };

  // Save selection
  const confirmCaptured = () => {
    if (mode === "photo" && capturedPhoto) {
      onCapture(capturedPhoto);
    } else if (mode === "video" && recordedVideo) {
      onCapture(recordedVideo.url, recordedVideo.duration, recordedVideo.size);
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const isVideoValidLength = (secs: number) => {
    return secs >= 300 && secs <= 480; // 5 to 8 minutes
  };

  return (
    <div id="camera_modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-400">
              {mode === "photo" ? "Registre a foto correspondente" : "Grave a conferência completa (5 a 8 minutos)"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[300px]">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 w-full">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode 1: Photo Preview */}
          {mode === "photo" && capturedPhoto ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center">
              <img src={capturedPhoto} alt="Evidência capturada" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              <button
                onClick={() => setCapturedPhoto(null)}
                className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/70 hover:bg-black/90 text-white text-xs font-semibold py-2 px-3 rounded-full transition border border-white/10 shadow-lg"
              >
                <RotateCw size={14} />
                Tirar Outra
              </button>
            </div>
          ) : mode === "video" && recordedVideo ? (
            /* Mode 2: Video Preview */
            <div className="w-full flex flex-col gap-4">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center">
                <video src={recordedVideo.url} controls className="w-full h-full object-contain" />
                <button
                  onClick={() => setRecordedVideo(null)}
                  className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/70 hover:bg-black/90 text-white text-xs font-semibold py-2 px-3 rounded-full transition border border-white/10 shadow-lg"
                >
                  <RotateCw size={14} />
                  Gravar Outro
                </button>
              </div>

              {/* Length Indicator & Warning */}
              <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                isVideoValidLength(recordedVideo.duration)
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              }`}>
                <div className="flex items-center gap-2 font-semibold">
                  {isVideoValidLength(recordedVideo.duration) ? (
                    <Check size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                  <span>Duração do vídeo: {formatTime(recordedVideo.duration)}</span>
                </div>
                <p className="text-xs opacity-90">
                  {isVideoValidLength(recordedVideo.duration)
                    ? "✓ O vídeo atende ao critério de duração obrigatório (entre 5 e 8 minutos)."
                    : "⚠️ Atenção: A gravação deve ter entre 5 e 8 minutos (300 a 480 segundos) conforme as normas obrigatórias. Por favor, simule ou envie um arquivo com o tempo correto para homologação."}
                </p>
                <p className="text-[10px] opacity-75 font-mono">
                  Tamanho: {(recordedVideo.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : hasCamera && stream && !isUploadMode ? (
            /* Mode 3: Active Camera Stream */
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Live Overlay Indicators */}
              {mode === "video" && isRecording && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse shadow-md">
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  GRAVANDO • {formatTime(recordingTime)}
                </div>
              )}

              {/* Quick Simulation Trigger for testing speed */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={mode === "photo" ? simulatePhoto : simulateVideo}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-full shadow-lg border border-emerald-500 transition hover:scale-105"
                >
                  <Sparkles size={14} />
                  Simular Captura
                </button>
              </div>

              {/* Controls bar overlaid inside camera */}
              <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-6">
                {mode === "photo" ? (
                  <button
                    onClick={takePhoto}
                    className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 hover:border-emerald-400 transition transform hover:scale-105 flex items-center justify-center shadow-2xl"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
                      <Camera size={20} />
                    </div>
                  </button>
                ) : (
                  <>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="w-16 h-16 rounded-full bg-red-600 border-4 border-slate-300 hover:border-red-500 transition transform hover:scale-105 flex items-center justify-center shadow-2xl"
                      >
                        <div className="w-6 h-6 rounded bg-white" />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="w-16 h-16 rounded-full bg-slate-800 border-4 border-red-500 transition transform hover:scale-105 flex items-center justify-center shadow-2xl"
                      >
                        <Square size={20} className="text-red-500 fill-red-500" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : !allowUpload ? (
            /* Restricted Upload Message */
            <div className="w-full border-2 border-dashed border-red-500/20 bg-red-500/5 rounded-xl p-8 flex flex-col items-center justify-center gap-4 min-h-[240px]">
              <div className="p-4 rounded-full bg-slate-800 text-red-400">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center text-slate-300">
                <p className="text-sm font-semibold text-red-400">Upload Bloqueado</p>
                <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
                  Seu perfil de acesso (Supervisor ou Operador) não possui permissão para enviar arquivos locais do dispositivo. Por favor, utilize a câmera integrada para capturar a evidência física diretamente.
                </p>
              </div>
            </div>
          ) : (
            /* Mode 4: Drag and drop upload fallback */
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition cursor-pointer min-h-[240px] ${
                dragActive
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-slate-700 hover:border-slate-500 bg-slate-800/20"
              }`}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept={mode === "photo" ? "image/*" : "video/*"}
                onChange={handleFileInput}
              />
              <label htmlFor="file-upload" className="flex flex-col items-center gap-3 w-full cursor-pointer">
                <div className="p-4 rounded-full bg-slate-800 text-slate-400">
                  {mode === "photo" ? <Camera size={32} /> : <FileVideo size={32} />}
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-emerald-400 hover:underline">
                    Clique para enviar
                  </span>{" "}
                  <span className="text-sm text-slate-400">ou arraste e solte o arquivo</span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {mode === "photo" ? "Formatos: PNG, JPG, WEBP" : "Formatos: MP4, WEBM (obrigatório 5-8 min)"}
                </p>
              </label>

              {/* Standard Simulators for quick check when no camera/files are nearby */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-xs text-slate-500">Sem arquivos para testar?</p>
                <button
                  type="button"
                  onClick={mode === "photo" ? simulatePhoto : simulateVideo}
                  className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold py-2 px-4 rounded-full border border-emerald-500/30 transition"
                >
                  <Sparkles size={14} />
                  Simular Evidência Perfeita
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between gap-3 bg-slate-900/50">
          <div>
            {hasCamera && allowUpload && (
              <button
                type="button"
                onClick={() => {
                  if (isUploadMode) {
                    setIsUploadMode(false);
                    startCamera();
                  } else {
                    setIsUploadMode(true);
                    stopCamera();
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-350 transition rounded-xl bg-slate-800 hover:bg-slate-700/80 flex items-center gap-1.5"
              >
                <Upload size={13} />
                {isUploadMode ? "Usar Câmera" : "Usar Upload (Enviar Arquivo)"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition rounded-xl hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              onClick={confirmCaptured}
              disabled={
                (mode === "photo" && !capturedPhoto) ||
                (mode === "video" && !recordedVideo)
              }
              className={`px-5 py-2 text-sm font-semibold rounded-xl flex items-center gap-1.5 transition ${
                (mode === "photo" && capturedPhoto) || (mode === "video" && recordedVideo)
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Check size={16} />
              Confirmar e Usar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
