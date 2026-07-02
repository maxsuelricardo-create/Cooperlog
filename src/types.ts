/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Carregamento {
  id: string;
  pedido: string;
  notaFiscal: string;
  cliente: string;
  transportadora: string;
  motorista: string;
  motoristaDocumento?: string; // CPF or RG
  placa: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "finalized";
  protocolo: string | null;
  finalizedAt: string | null;

  // Etapa 2: Evidências antes do embarque (Exatamente 3 fotos)
  fotosAntes: {
    foto1: string | null; // Mercadoria organizada para carregamento
    foto2: string | null; // Conferência da carga
    foto3: string | null; // Veículo vazio ou parcialmente carregado antes do embarque
  };

  // Etapa 3: Vídeo (Gravação entre 5 e 8 minutos)
  videoUrl: string | null; // Blob URL ou base64
  videoDuration: number | null; // Duração em segundos
  videoSize: number | null; // Tamanho em bytes
  videoRecordedReal: boolean; // Se foi gravado de verdade ou simulado

  // Etapa 4: Evidências após embarque (Exatamente 3 fotos)
  fotosDepois: {
    foto1: string | null; // Carga totalmente embarcada
    foto2: string | null; // Vista interna do veículo carregado
    foto3: string | null; // Fechamento do compartimento de carga
  };

  // Etapa 5: Lacre
  fotoLacreAproximada: string | null; // Foto aproximada do lacre
  fotoLacreVeiculo: string | null; // Foto do lacre instalado no veículo
  numeroLacre: string;
  lacreTransportadora: string;

  // Etapa 6: Assinaturas
  assinaturaMotorista: string | null; // Assinatura digital (base64 canvas)
  conferenteConfirmado: boolean;
  conferenteNome: string | null;
  conferenteConfirmadoAt: string | null;

  // Multi-filiais
  filialId?: string;
  filialName?: string;
  synced?: boolean;
}

export interface Filial {
  id: string;
  cnpj: string;
  name: string;
  city: string;
  state: string;
  createdAt: string;
}

export type UserRole = "master" | "supervisor" | "operador";

export interface LoggedUser {
  username: string;
  role: UserRole;
  filialId?: string; // empty for master
  filialName?: string;
}

export interface Usuario {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  filialId?: string;
  filialName?: string;
  createdAt: string;
}

export interface KPIStats {
  total: number;
  finalizados: number;
  emAndamento: number;
  tempoMedioMinutos: number;
}
