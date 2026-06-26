import { admin } from "../config/firebaseInit";
import { listFolders } from "./google";
import workgroups from "../credentials/workgroupsfolders.json";

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  children: { [key: string]: FolderNode };
}

interface FolderLevelCache {
  name: string;
  children: { [id: string]: { id: string; name: string } };
  lastUpdate: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000;

export async function clearFolderCache(workgroupId: string): Promise<void> {
  try {
    console.log(`Limpando cache de pastas para workgroup ${workgroupId}`);
    await admin.database().ref(`folders/workgroup_${workgroupId}`).remove();
    console.log(`Cache limpo para workgroup ${workgroupId}`);
  } catch (error) {
    console.error(`Erro ao limpar cache para ${workgroupId}:`, error);
  }
}

export async function forceUpdateFolderTree(workgroupId: string): Promise<void> {
  const groupConfig = workgroups.find((g: any) => g.value === workgroupId);
  if (!groupConfig) {
    console.error(`Grupo ${workgroupId} nao encontrado em workgroupsfolders.json`);
    return;
  }
  await clearFolderCache(workgroupId);
}

export async function getOrCacheFolderLevel(
  workgroupId: string,
  folderId: string,
  folderName: string,
  forceRefresh: boolean = false
): Promise<FolderNode | null> {
  try {
    const levelRef = admin.database().ref(
      `folders/workgroup_${workgroupId}/levels/${folderId}`
    );

    if (!forceRefresh) {
      const snapshot = await levelRef.once("value");
      const cached: FolderLevelCache | null = snapshot.val();

      if (cached && cached.lastUpdate) {
        const lastUpdate = new Date(cached.lastUpdate);
        const ttlAgo = new Date(Date.now() - CACHE_TTL_MS);
        if (lastUpdate > ttlAgo) {
          console.log(`Cache valido para ${folderName}, usando cache`);
          return levelToNode(folderId, cached);
        }
      }
    }

    console.log(`Carregando subpastas de "${folderName}" (${folderId})...`);
    const subfolders = await listFoldersWithRetry(folderId);

    const children: { [id: string]: { id: string; name: string } } = {};
    for (const sf of subfolders) {
      children[sf.id] = { id: sf.id, name: sf.name };
    }

    const cacheData: FolderLevelCache = {
      name: folderName,
      children,
      lastUpdate: new Date().toISOString(),
    };

    await levelRef.set(cacheData);
    console.log(`Nivel "${folderName}" cacheado com ${Object.keys(children).length} subpastas`);

    return levelToNode(folderId, cacheData);
  } catch (error) {
    console.error(`Erro ao carregar nivel da pasta ${folderId}:`, error);
    return null;
  }
}

function levelToNode(folderId: string, data: FolderLevelCache): FolderNode {
  const children: { [key: string]: FolderNode } = {};
  for (const [childId, child] of Object.entries(data.children || {})) {
    children[childId] = {
      id: child.id,
      name: child.name,
      path: child.name,
      children: {},
    };
  }
  return {
    id: folderId,
    name: data.name,
    path: "",
    children,
  };
}

async function listFoldersWithRetry(
  folderId: string,
  maxRetries: number = 2
): Promise<{ id: string; name: string }[]> {
  const LIST_TIMEOUT_MS = 8000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout ao listar pastas")),
          LIST_TIMEOUT_MS
        )
      );

      const listPromise = listFolders(folderId);
      const result = await Promise.race([listPromise, timeoutPromise]);

      return result;
    } catch (error) {
      console.log(
        `Tentativa ${attempt}/${maxRetries} falhou para pasta ${folderId}:`,
        (error as Error).message
      );

      if (attempt === maxRetries) {
        console.error(`Todas as tentativas falharam para pasta ${folderId}`);
        return [];
      }

      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return [];
}

export function getWorkgroupConfig(chatId: number | string) {
  return workgroups.find((g: any) => g.value === String(chatId));
}
