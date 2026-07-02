/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Carregamento, Filial, Usuario } from "../types";
import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";

const DB_NAME = "CooperLogDB";
const DB_VERSION = 1;
const STORE_NAME = "carregamentos";

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Erro ao abrir o IndexedDB");
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Fetches all load records.
 * First tries to load from Firestore and cache them locally in IndexedDB.
 * Fallbacks to IndexedDB cache on network/permission error.
 */
export async function getCarregamentos(): Promise<Carregamento[]> {
  try {
    // 1. Fetch current local records from IndexedDB first
    let localLoads: Carregamento[] = [];
    try {
      const idb = await initDb();
      localLoads = await new Promise<Carregamento[]>((resolve, reject) => {
        const transaction = idb.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as Carregamento[]);
        request.onerror = () => reject(request.error);
      });
    } catch (localErr) {
      console.warn("Could not read local IndexedDB cache for sync:", localErr);
    }

    // 2. Fetch records from Firestore cloud
    const querySnapshot = await getDocs(collection(db, "carregamentos"));
    const firestoreLoads: Carregamento[] = [];
    querySnapshot.forEach((docSnap) => {
      firestoreLoads.push(docSnap.data() as Carregamento);
    });

    // 3. Reconcile both sources to prevent silent data loss or overwrite
    const mergedMap = new Map<string, Carregamento>();

    // Add all local records first
    for (const load of localLoads) {
      mergedMap.set(load.id, load);
    }

    // Compare and merge with Firestore records
    for (const fLoad of firestoreLoads) {
      const lLoad = mergedMap.get(fLoad.id);
      if (!lLoad) {
        // Not in local cache, adopt the Firestore cloud version and mark synced
        mergedMap.set(fLoad.id, { ...fLoad, synced: true });
      } else {
        // Exists in both, choose the most recently updated version
        const lTime = new Date(lLoad.updatedAt || lLoad.createdAt).getTime();
        const fTime = new Date(fLoad.updatedAt || fLoad.createdAt).getTime();
        if (fTime >= lTime) {
          mergedMap.set(fLoad.id, { ...fLoad, synced: true });
        }
      }
    }

    // Detect records deleted on another device:
    // If a record has `synced: true` in the computer's local cache but is NOT present in Firestore,
    // it was deleted in the cloud. Remove it locally and do not re-upload it.
    const deletedOnCloudIds = new Set<string>();
    for (const lLoad of localLoads) {
      if (lLoad.synced === true) {
        const existsInFirestore = firestoreLoads.some(f => f.id === lLoad.id);
        if (!existsInFirestore) {
          deletedOnCloudIds.add(lLoad.id);
          mergedMap.delete(lLoad.id);
        }
      }
    }

    // Background pruning of deleted records from IndexedDB
    if (deletedOnCloudIds.size > 0) {
      try {
        const idb = await initDb();
        const transaction = idb.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        for (const id of deletedOnCloudIds) {
          store.delete(id);
          console.log(`Pruned deleted load ${id} from local IndexedDB.`);
        }
      } catch (delErr) {
        console.warn("Failed to prune deleted loads locally:", delErr);
      }
    }

    // 4. Upload any local-only or newer local records up to Firestore
    for (const load of localLoads) {
      if (deletedOnCloudIds.has(load.id)) {
        continue;
      }
      const fLoad = firestoreLoads.find(f => f.id === load.id);
      if (!fLoad) {
        // Local-only, upload it to Firestore
        try {
          const syncedLoad = { ...load, synced: true };
          await setDoc(doc(db, "carregamentos", load.id), syncedLoad);
          mergedMap.set(load.id, syncedLoad);
          console.log(`Synced local-only load ${load.id} to Firestore.`);
        } catch (syncErr) {
          console.warn(`Failed to upload local-only load ${load.id}:`, syncErr);
        }
      } else {
        const lTime = new Date(load.updatedAt || load.createdAt).getTime();
        const fTime = new Date(fLoad.updatedAt || fLoad.createdAt).getTime();
        if (lTime > fTime) {
          // Local is newer, update Firestore
          try {
            const syncedLoad = { ...load, synced: true };
            await setDoc(doc(db, "carregamentos", load.id), syncedLoad);
            mergedMap.set(load.id, syncedLoad);
            console.log(`Synced newer local load ${load.id} to Firestore.`);
          } catch (syncErr) {
            console.warn(`Failed to upload newer local load ${load.id}:`, syncErr);
          }
        }
      }
    }

    const finalLoads = Array.from(mergedMap.values());

    // 5. Overwrite IndexedDB cache with the synchronized merged collection
    try {
      const idb = await initDb();
      const transaction = idb.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      for (const load of finalLoads) {
        store.put(load);
      }
    } catch (cacheErr) {
      console.warn("Could not update local IndexedDB cache with synchronized data:", cacheErr);
    }

    // Sort by creation date descending
    finalLoads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return finalLoads;
  } catch (err) {
    console.warn("Erro ao buscar no Firestore, retornando do cache local (IndexedDB):", err);
    
    // Fallback to local cache in IndexedDB if completely offline
    const idb = await initDb();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const data = request.result as Carregamento[];
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(data);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

/**
 * Fetches a single load record.
 */
export async function getCarregamento(id: string): Promise<Carregamento | undefined> {
  try {
    const docRef = doc(db, "carregamentos", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Carregamento;
      
      // Cache locally
      try {
        const idb = await initDb();
        const transaction = idb.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.put(data);
      } catch (e) {
        console.warn("Error caching single load:", e);
      }
      
      return data;
    }
  } catch (err) {
    console.warn(`Erro ao ler load ${id} do Firestore, usando local:`, err);
  }

  // Fallback to IndexedDB
  const idb = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = idb.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as Carregamento | undefined);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves a load record. Writes to both Firestore and local IndexedDB cache.
 */
export async function saveCarregamento(carregamento: Carregamento): Promise<void> {
  // 1. Try to write to Firestore first to check if cloud-synced
  let isSynced = false;
  try {
    const docRef = doc(db, "carregamentos", carregamento.id);
    await setDoc(docRef, { ...carregamento, synced: true });
    isSynced = true;
  } catch (firestoreErr) {
    console.error("Firestore sync failed (saved locally only):", firestoreErr);
  }

  // 2. Write to local cache with correct synced state so the user has immediate visual updates
  try {
    const idb = await initDb();
    const transaction = idb.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ ...carregamento, synced: isSynced });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (cacheErr) {
    console.warn("Failed saving load to IndexedDB cache:", cacheErr);
  }
}

/**
 * Deletes a load record. Deletes from both Firestore and local IndexedDB cache.
 */
export async function deleteCarregamento(id: string): Promise<void> {
  // 1. Delete from local cache
  try {
    const idb = await initDb();
    const transaction = idb.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (cacheErr) {
    console.warn("Failed deleting load from IndexedDB cache:", cacheErr);
  }

  // 2. Delete from Firestore
  try {
    const docRef = doc(db, "carregamentos", id);
    await deleteDoc(docRef);
  } catch (firestoreErr) {
    console.error("Failed to delete from Firestore:", firestoreErr);
  }
}

/**
 * Seed initial data if the database is completely empty.
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  // Sync filiais
  seedFiliais();
  // Sync usuarios
  seedUsuarios();

  const list = await getCarregamentos();
  if (list.length > 0) return;

  const sampleLoads: Carregamento[] = [
    {
      id: "CL-2026-0001",
      pedido: "PED-98122",
      notaFiscal: "NF-0004123",
      cliente: "Nuts Import & Export Ltda",
      transportadora: "Transportadora Solimões",
      motorista: "Sebastião de Souza Melo",
      motoristaDocumento: "012.345.678-99",
      placa: "MZW-4A82",
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(),
      status: "finalized",
      protocolo: "PRT-20260628-89A1",
      finalizedAt: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(),
      fotosAntes: {
        foto1: "placeholder_organizado",
        foto2: "placeholder_conferencia",
        foto3: "placeholder_vazio",
      },
      videoUrl: "placeholder_video",
      videoDuration: 345,
      videoSize: 24500000,
      videoRecordedReal: false,
      fotosDepois: {
        foto1: "placeholder_carregado",
        foto2: "placeholder_interno",
        foto3: "placeholder_fechado",
      },
      fotoLacreAproximada: "placeholder_lacre_close",
      fotoLacreVeiculo: "placeholder_lacre_veiculo",
      numeroLacre: "LAC-90218-AC",
      lacreTransportadora: "Transportadora Solimões",
      assinaturaMotorista: "placeholder_signature",
      conferenteConfirmado: true,
      conferenteNome: "Carlos Silva (Conferente)",
      conferenteConfirmadoAt: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(),
      filialId: "filial-rb",
      filialName: "Rio Branco - Matriz",
    },
    {
      id: "CL-2026-0002",
      pedido: "PED-98150",
      notaFiscal: "NF-0004154",
      cliente: "Castanhas do Acre S/A",
      transportadora: "Logística TransAcreana",
      motorista: "Raimundo Nonato Silva",
      motoristaDocumento: "987.654.321-11",
      placa: "NAG-1249",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 11.5 * 60 * 60 * 1000).toISOString(),
      status: "finalized",
      protocolo: "PRT-20260629-23BC",
      finalizedAt: new Date(Date.now() - 11.5 * 60 * 60 * 1000).toISOString(),
      fotosAntes: {
        foto1: "placeholder_organizado",
        foto2: "placeholder_conferencia",
        foto3: "placeholder_vazio",
      },
      videoUrl: "placeholder_video",
      videoDuration: 380,
      videoSize: 28900000,
      videoRecordedReal: false,
      fotosDepois: {
        foto1: "placeholder_carregado",
        foto2: "placeholder_interno",
        foto3: "placeholder_fechado",
      },
      fotoLacreAproximada: "placeholder_lacre_close",
      fotoLacreVeiculo: "placeholder_lacre_veiculo",
      numeroLacre: "LAC-77401-BR",
      lacreTransportadora: "Logística TransAcreana",
      assinaturaMotorista: "placeholder_signature",
      conferenteConfirmado: true,
      conferenteNome: "Carlos Silva (Conferente)",
      conferenteConfirmadoAt: new Date(Date.now() - 11.5 * 60 * 60 * 1000).toISOString(),
      filialId: "filial-br",
      filialName: "Brasiléia - Filial Castanha",
    },
    {
      id: "CL-2026-0003",
      pedido: "PED-98201",
      notaFiscal: "NF-0004189",
      cliente: "Alimentos Orgânicos da Amazônia",
      transportadora: "Cooperacre Logística",
      motorista: "Manoel Francisco Castro",
      motoristaDocumento: "345.678.901-22",
      placa: "OXP-8102",
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
      filialId: "filial-sm",
      filialName: "Sena Madureira - Filial Borracha",
    },
  ];

  for (const load of sampleLoads) {
    await saveCarregamento(load);
  }
}

// FILIAL PERSISTENCE WITH FIRESTORE AND LOCAL STORAGE DUAL SYNC
const FILIAIS_STORAGE_KEY = "cooperlog_filiais";

const DEFAULT_FILIAIS: Filial[] = [
  {
    id: "filial-rb",
    cnpj: "04.223.118/0001-90",
    name: "Rio Branco - Matriz",
    city: "Rio Branco",
    state: "AC",
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "filial-br",
    cnpj: "04.223.118/0002-71",
    name: "Brasiléia - Filial Castanha",
    city: "Brasiléia",
    state: "AC",
    createdAt: new Date("2026-01-02").toISOString(),
  },
  {
    id: "filial-sm",
    cnpj: "04.223.118/0003-52",
    name: "Sena Madureira - Filial Borracha",
    city: "Sena Madureira",
    state: "AC",
    createdAt: new Date("2026-01-03").toISOString(),
  },
];

/**
 * Synchronous fetch of filiais (returns localStorage cache).
 * Also launches an asynchronous sync with Firestore in the background to keep list fresh.
 */
export function getFiliais(): Filial[] {
  const data = localStorage.getItem(FILIAIS_STORAGE_KEY);
  
  // Launch background sync with Firestore
  syncFiliaisWithFirestore();

  if (!data) {
    seedFiliais();
    return DEFAULT_FILIAIS;
  }
  try {
    return JSON.parse(data) as Filial[];
  } catch (err) {
    console.error("Erro ao ler filiais do localStorage", err);
    return DEFAULT_FILIAIS;
  }
}

/**
 * Triggers background sync of filiais with Firestore
 */
async function syncFiliaisWithFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "filiais"));
    const firestoreData: Filial[] = [];
    querySnapshot.forEach((docSnap) => {
      firestoreData.push(docSnap.data() as Filial);
    });

    const localDataRaw = localStorage.getItem(FILIAIS_STORAGE_KEY);
    const localData: Filial[] = localDataRaw ? JSON.parse(localDataRaw) : DEFAULT_FILIAIS;

    // Merge both sources
    const mergedMap = new Map<string, Filial>();
    for (const f of localData) {
      mergedMap.set(f.id, f);
    }
    for (const f of firestoreData) {
      mergedMap.set(f.id, f);
    }

    const finalFiliais = Array.from(mergedMap.values());
    localStorage.setItem(FILIAIS_STORAGE_KEY, JSON.stringify(finalFiliais));

    // Upload local-only to Firestore
    for (const f of localData) {
      if (!firestoreData.some(fd => fd.id === f.id)) {
        await setDoc(doc(db, "filiais", f.id), f);
      }
    }
  } catch (err) {
    console.warn("Background sync with Firestore filiais failed (using local cache):", err);
  }
}

export function seedFiliais(): void {
  const data = localStorage.getItem(FILIAIS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(FILIAIS_STORAGE_KEY, JSON.stringify(DEFAULT_FILIAIS));
  }
}

export async function saveFilial(filial: Filial): Promise<void> {
  // 1. Write to localStorage cache
  const list = getFiliais();
  const index = list.findIndex((f) => f.id === filial.id);
  if (index >= 0) {
    list[index] = filial;
  } else {
    list.push(filial);
  }
  localStorage.setItem(FILIAIS_STORAGE_KEY, JSON.stringify(list));

  // 2. Write to Firestore
  try {
    await setDoc(doc(db, "filiais", filial.id), filial);
  } catch (err) {
    console.error("Erro ao salvar filial no Firestore:", err);
  }
}

export async function deleteFilial(id: string): Promise<void> {
  // 1. Remove from localStorage cache
  const list = getFiliais();
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(FILIAIS_STORAGE_KEY, JSON.stringify(filtered));

  // 2. Remove from Firestore
  try {
    await deleteDoc(doc(db, "filiais", id));
  } catch (err) {
    console.error("Erro ao excluir filial do Firestore:", err);
  }
}

// USUARIOS PERSISTENCE WITH FIRESTORE AND LOCAL STORAGE DUAL SYNC
const USUARIOS_STORAGE_KEY = "cooperlog_usuarios";

const DEFAULT_USUARIOS: Usuario[] = [
  {
    id: "user-admin",
    username: "admin",
    password: "07222807",
    role: "master",
    createdAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "user-supervisor",
    username: "supervisor",
    password: "123",
    role: "supervisor",
    filialId: "filial-rb",
    filialName: "Rio Branco - Matriz",
    createdAt: new Date("2026-01-02").toISOString(),
  },
  {
    id: "user-operador",
    username: "operador",
    password: "123",
    role: "operador",
    filialId: "filial-rb",
    filialName: "Rio Branco - Matriz",
    createdAt: new Date("2026-01-03").toISOString(),
  },
];

export function getUsuarios(): Usuario[] {
  const data = localStorage.getItem(USUARIOS_STORAGE_KEY);
  
  // Launch background sync with Firestore
  syncUsuariosWithFirestore();

  if (!data) {
    seedUsuarios();
    return DEFAULT_USUARIOS;
  }
  try {
    const list = JSON.parse(data) as Usuario[];
    let updated = false;
    const mapped = list.map((u) => {
      if (u.role === "master" || u.username === "admin" || u.id === "user-admin") {
        if (u.password !== "07222807") {
          u.password = "07222807";
          updated = true;
        }
      }
      return u;
    });
    if (updated) {
      localStorage.setItem(USUARIOS_STORAGE_KEY, JSON.stringify(mapped));
    }
    return mapped;
  } catch (err) {
    console.error("Erro ao ler usuários do localStorage", err);
    return DEFAULT_USUARIOS;
  }
}

async function syncUsuariosWithFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    const firestoreData: Usuario[] = [];
    querySnapshot.forEach((docSnap) => {
      firestoreData.push(docSnap.data() as Usuario);
    });

    const localDataRaw = localStorage.getItem(USUARIOS_STORAGE_KEY);
    const localData: Usuario[] = localDataRaw ? JSON.parse(localDataRaw) : DEFAULT_USUARIOS;

    // Merge both sources
    const mergedMap = new Map<string, Usuario>();
    for (const u of localData) {
      mergedMap.set(u.id, u);
    }
    for (const u of firestoreData) {
      mergedMap.set(u.id, u);
    }

    let finalUsuarios = Array.from(mergedMap.values());
    
    // Ensure admin master password is correctly updated on merge
    let localUpdated = false;
    finalUsuarios = finalUsuarios.map((u) => {
      if (u.role === "master" || u.username === "admin" || u.id === "user-admin") {
        if (u.password !== "07222807") {
          u.password = "07222807";
          localUpdated = true;
        }
      }
      return u;
    });

    localStorage.setItem(USUARIOS_STORAGE_KEY, JSON.stringify(finalUsuarios));

    // Upload local-only (or updated master password) to Firestore
    for (const u of finalUsuarios) {
      const matchInFirestore = firestoreData.find(fd => fd.id === u.id);
      if (!matchInFirestore || matchInFirestore.password !== u.password) {
        await setDoc(doc(db, "usuarios", u.id), u);
      }
    }
  } catch (err) {
    console.warn("Background sync with Firestore usuarios failed (using local cache):", err);
  }
}

export function seedUsuarios(): void {
  const data = localStorage.getItem(USUARIOS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(USUARIOS_STORAGE_KEY, JSON.stringify(DEFAULT_USUARIOS));
  }
}

export async function saveUsuario(usuario: Usuario): Promise<void> {
  // 1. Write to localStorage cache
  const list = getUsuarios();
  const index = list.findIndex((u) => u.id === usuario.id || u.username.toLowerCase() === usuario.username.toLowerCase());
  if (index >= 0) {
    list[index] = usuario;
  } else {
    list.push(usuario);
  }
  localStorage.setItem(USUARIOS_STORAGE_KEY, JSON.stringify(list));

  // 2. Write to Firestore
  try {
    await setDoc(doc(db, "usuarios", usuario.id), usuario);
  } catch (err) {
    console.error("Erro ao salvar usuário no Firestore:", err);
  }
}

export async function deleteUsuario(id: string): Promise<void> {
  // 1. Remove from localStorage cache
  const list = getUsuarios();
  const filtered = list.filter((u) => u.id !== id);
  localStorage.setItem(USUARIOS_STORAGE_KEY, JSON.stringify(filtered));

  // 2. Remove from Firestore
  try {
    await deleteDoc(doc(db, "usuarios", id));
  } catch (err) {
    console.error("Erro ao excluir usuário do Firestore:", err);
  }
}
