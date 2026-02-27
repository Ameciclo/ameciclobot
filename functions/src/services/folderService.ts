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
    
    const tree = await buildFolderTreeFromDrive(groupConfig.folderId, groupConfig.label, "");
    
    await admin.database().ref(`folders/workgroup_${workgroupId}`).set({
      rootFolderId: groupConfig.folderId,
      lastUpdate: new Date().toISOString(),
      tree: { root: tree }
    });

    console.log(`Árvore de pastas atualizada para ${groupConfig.label}`);
  } catch (error) {
    console.error(`Erro ao atualizar árvore de pastas para ${workgroupId}:`, error);
    throw error;
  }
}

/**
 * Constrói recursivamente a árvore de pastas a partir do Google Drive
 */
async function buildFolderTreeFromDrive(
  folderId: string, 
  folderName: string, 
  currentPath: string
): Promise<FolderNode> {
  try {
    const node: FolderNode = {
      id: folderId,
      name: folderName,
      path: currentPath,
      children: {}
    };

    // Lista subpastas do Google Drive
    const subfolders = await listFolders(folderId);
    
    // Recursivamente constrói árvore para cada subpasta
    for (const subfolder of subfolders) {
      const subPath = currentPath ? `${currentPath}/${subfolder.name}` : subfolder.name;
      node.children[subfolder.id] = await buildFolderTreeFromDrive(
        subfolder.id, 
        subfolder.name, 
        subPath
      );
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