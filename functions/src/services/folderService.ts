import { admin } from "../config/firebaseInit";
import { listFolders } from "./google";
import workgroups from "../credentials/workgroupsfolders.json";

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  children: { [key: string]: FolderNode };
}

export interface WorkgroupFolders {
  rootFolderId: string;
  lastUpdate: string;
  tree: { root: FolderNode };
}

/**
 * Limpa o cache de pastas para um grupo específico
 */
export async function clearFolderCache(workgroupId: string): Promise<void> {
  try {
    console.log(`Limpando cache de pastas para workgroup ${workgroupId}`);
    await admin.database().ref(`folders/workgroup_${workgroupId}`).remove();
    console.log(`Cache limpo para workgroup ${workgroupId}`);
  } catch (error) {
    console.error(`Erro ao limpar cache para ${workgroupId}:`, error);
  }
}

/**
 * Força atualização completa removendo cache primeiro
 */
export async function forceUpdateFolderTree(workgroupId: string): Promise<void> {
  await clearFolderCache(workgroupId);
  await updateFolderTree(workgroupId);
}

/**
 * Obtém a árvore de pastas do Firebase para um grupo de trabalho
 */
export async function getFolderTree(workgroupId: string): Promise<FolderNode | null> {
  try {
    const snapshot = await admin.database()
      .ref(`folders/workgroup_${workgroupId}/tree/root`)
      .once('value');
    return snapshot.val();
  } catch (error) {
    console.error(`Erro ao obter árvore de pastas para ${workgroupId}:`, error);
    return null;
  }
}

/**
 * Atualiza a árvore de pastas no Firebase sincronizando com Google Drive
 */
export async function updateFolderTree(workgroupId: string): Promise<void> {
  try {
    const groupConfig = workgroups.find((g: any) => g.value === workgroupId);
    if (!groupConfig) {
      console.error(`Grupo ${workgroupId} não encontrado em workgroupsfolders.json`);
      return;
    }

    console.log(`Atualizando árvore de pastas para ${groupConfig.label}...`);
    
    // Verifica cache recente (menos de 1 hora)
    const cacheRef = admin.database().ref(`folders/workgroup_${workgroupId}`);
    const cacheSnapshot = await cacheRef.once('value');
    const cachedData = cacheSnapshot.val();
    
    if (cachedData && cachedData.lastUpdate) {
      const lastUpdate = new Date(cachedData.lastUpdate);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastUpdate > oneHourAgo) {
        console.log(`Cache válido para ${groupConfig.label}, pulando atualização`);
        return;
      }
    }
    
    // Timeout reduzido para 20 segundos
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout na construção da árvore")), 20000)
    );
    
    const buildPromise = buildFolderTreeFromDrive(groupConfig.folderId, groupConfig.label, "");
    
    const tree = await Promise.race([buildPromise, timeoutPromise]);
    
    await cacheRef.set({
      rootFolderId: groupConfig.folderId,
      lastUpdate: new Date().toISOString(),
      tree: { root: tree }
    });

    console.log(`Árvore de pastas atualizada para ${groupConfig.label}`);
  } catch (error) {
    console.error(`Erro ao atualizar árvore de pastas para ${workgroupId}:`, error);
    // Não propaga o erro para evitar falha na criação da pasta
    console.log("Continuando sem atualizar a árvore...");
  }
}

/**
 * Constrói recursivamente a árvore de pastas a partir do Google Drive
 * Com limite de profundidade e otimizações para evitar timeouts
 */
async function buildFolderTreeFromDrive(
  folderId: string, 
  folderName: string, 
  currentPath: string,
  depth: number = 0,
  maxDepth: number = 3
): Promise<FolderNode> {
  try {
    const node: FolderNode = {
      id: folderId,
      name: folderName,
      path: currentPath,
      children: {}
    };

    // Limita a profundidade para evitar timeouts (reduzido para 3)
    if (depth >= maxDepth) {
      console.log(`Profundidade máxima atingida (${maxDepth}) para pasta: ${folderName}`);
      return node;
    }

    // Lista subpastas com timeout reduzido e retry
    const subfolders = await listFoldersWithRetry(folderId, 3);
    
    if (!subfolders || subfolders.length === 0) {
      return node;
    }
    
    // Limita o número total de subpastas processadas
    const maxSubfolders = 20;
    const limitedSubfolders = subfolders.slice(0, maxSubfolders);
    
    if (subfolders.length > maxSubfolders) {
      console.log(`Limitando processamento: ${maxSubfolders}/${subfolders.length} pastas em ${folderName}`);
    }
    
    // Processa sequencialmente para evitar sobrecarga
    for (const subfolder of limitedSubfolders) {
      const subPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
      try {
        const childNode = await buildFolderTreeFromDrive(
          subfolder.id, 
          subfolder.name, 
          subPath,
          depth + 1,
          maxDepth
        );
        node.children[subfolder.id] = childNode;
      } catch (error) {
        console.error(`Erro ao processar subpasta ${subfolder.name}:`, error);
        // Continua processando outras pastas
      }
    }

    return node;
  } catch (error) {
    console.error(`Erro ao construir árvore para pasta ${folderId}:`, error);
    // Retorna nó vazio em caso de erro
    return {
      id: folderId,
      name: folderName,
      path: currentPath,
      children: {}
    };
  }
}

/**
 * Lista pastas com retry e timeout otimizado
 */
async function listFoldersWithRetry(
  folderId: string, 
  maxRetries: number = 3
): Promise<{ id: string; name: string }[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Timeout reduzido para 5 segundos
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout ao listar pastas")), 5000)
      );
      
      const listPromise = listFolders(folderId);
      const result = await Promise.race([listPromise, timeoutPromise]);
      
      return result;
    } catch (error) {
      console.log(`Tentativa ${attempt}/${maxRetries} falhou para pasta ${folderId}:`, (error as Error).message);
      
      if (attempt === maxRetries) {
        console.error(`Todas as tentativas falharam para pasta ${folderId}`);
        return [];
      }
      
      // Backoff exponencial: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return [];
}

/**
 * Navega para um caminho específico na árvore de pastas
 */
export function navigateToPath(rootNode: FolderNode, pathArray: string[]): FolderNode {
  let currentNode = rootNode;
  
  for (const pathSegment of pathArray) {
    if (!pathSegment) continue;
    
    // Procura o nó filho pelo nome da pasta
    const childNode = Object.values(currentNode.children).find(
      child => child.path.endsWith(pathSegment)
    );
    
    if (childNode) {
      currentNode = childNode;
    } else {
      // Se não encontrar, retorna o nó atual
      break;
    }
  }
  
  return currentNode;
}

/**
 * Obtém configuração do grupo de trabalho pelo chat ID
 */
export function getWorkgroupConfig(chatId: number | string) {
  return workgroups.find((g: any) => g.value === String(chatId));
}