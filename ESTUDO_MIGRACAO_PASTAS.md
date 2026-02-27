# 📋 Estudo: Migração Sistema de Pastas para Firebase

## 🎯 Objetivo Principal
Migrar do Google Drive API (lento) para Firebase Realtime Database para navegação de pastas mais rápida e intuitiva.

## 🔄 Unificação de Comandos

### Proposta: Juntar `/arquivar` no `/novo_arquivo`
**Lógica**: Se `/novo_arquivo` for usado como resposta a um arquivo, vira modo "arquivar" em vez de criar documento.

```typescript
bot.command("novo_arquivo", async (ctx: Context) => {
  // Verifica se é resposta a arquivo
  if (ctx.message?.reply_to_message && "document" in ctx.message.reply_to_message) {
    // MODO ARQUIVAR
    return handleArquivarMode(ctx);
  }
  
  // MODO CRIAR ARQUIVO (atual)
  const title = ctx.message.text.replace("/novo_arquivo", "").trim();
  if (!title) {
    return showNoTitleOptions(ctx); // Nova função
  }
  
  // Continua fluxo normal...
});
```

### Função para quando não tem título
```typescript
async function showNoTitleOptions(ctx: Context) {
  const buttons = [
    [{ text: "🔄 Atualizar Pastas", callback_data: "update_folders" }],
    [{ text: "❌ Cancelar", callback_data: "cancel_action" }]
  ];
  
  return ctx.reply(
    "Por favor, forneça um título para o arquivo.\nExemplo: `/novo_arquivo Nome do Arquivo`\n\nOu escolha uma opção:",
    { reply_markup: { inline_keyboard: buttons } }
  );
}
```

## 🏗️ Estrutura Firebase Realtime

```json
{
  "folders": {
    "workgroup_-1001378328092": {
      "rootFolderId": "0BxR5Ri6g5X_ZLWVVOVBpRVpzZ3c",
      "lastUpdate": "2024-12-20T10:30:00Z",
      "tree": {
        "root": {
          "id": "0BxR5Ri6g5X_ZLWVVOVBpRVpzZ3c",
          "name": "Secretaria",
          "path": "",
          "children": {
            "1of9L_0sEF7bgND_5NFjiWn6wLpn2M2-B": {
              "id": "1of9L_0sEF7bgND_5NFjiWn6wLpn2M2-B",
              "name": "Atas",
              "path": "Atas",
              "children": {
                "subfolder_id": {
                  "id": "subfolder_id",
                  "name": "2024",
                  "path": "Atas/2024",
                  "children": {}
                }
              }
            },
            "folder2_id": {
              "id": "folder2_id", 
              "name": "Relatórios",
              "path": "Relatórios",
              "children": {}
            }
          }
        }
      }
    }
  }
}
```

## 🔧 Implementação

### 1. Serviço de Pastas Firebase
```typescript
// services/folderService.ts
export interface FolderNode {
  id: string;
  name: string;
  path: string;
  children: { [key: string]: FolderNode };
}

export async function getFolderTree(workgroupId: string): Promise<FolderNode | null> {
  const snapshot = await admin.database()
    .ref(`folders/workgroup_${workgroupId}/tree/root`)
    .once('value');
  return snapshot.val();
}

export async function updateFolderTree(workgroupId: string): Promise<void> {
  const groupConfig = workgroups.find(g => g.value === workgroupId);
  if (!groupConfig) return;
  
  const tree = await buildFolderTreeFromDrive(groupConfig.folderId, groupConfig.label);
  await admin.database().ref(`folders/workgroup_${workgroupId}`).set({
    rootFolderId: groupConfig.folderId,
    lastUpdate: new Date().toISOString(),
    tree: { root: tree }
  });
}
```

### 2. Navegação Hierárquica
```typescript
export function createFolderNavigationKeyboard(
  node: FolderNode,
  tempId: string,
  currentPath: string = ""
): any[][] {
  const buttons = [];
  
  // Botão "Selecionar esta pasta"
  buttons.push([{
    text: `📁 Salvar em "${node.name}"`,
    callback_data: `select_folder:${tempId}:${node.id}`
  }]);
  
  // Botão voltar (se não for raiz)
  if (currentPath) {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    buttons.push([{
      text: "⬅️ Voltar",
      callback_data: `nav_folder:${tempId}:${parentPath}`
    }]);
  }
  
  // Subpastas (2 por linha)
  const children = Object.values(node.children);
  for (let i = 0; i < children.length; i += 2) {
    const row = [];
    
    row.push({
      text: `📂 ${children[i].name}`,
      callback_data: `nav_folder:${tempId}:${children[i].path}`
    });
    
    if (i + 1 < children.length) {
      row.push({
        text: `📂 ${children[i + 1].name}`,
        callback_data: `nav_folder:${tempId}:${children[i + 1].path}`
      });
    }
    
    buttons.push(row);
  }
  
  // Botão atualizar
  buttons.push([{
    text: "🔄 Atualizar Pastas",
    callback_data: `refresh_folders:${tempId}`
  }]);
  
  return buttons;
}
```

### 3. Modo Arquivar Integrado
```typescript
async function handleArquivarMode(ctx: Context) {
  const document = ctx.message?.reply_to_message?.document;
  if (!document) {
    return ctx.reply("Nenhum arquivo encontrado na mensagem respondida.");
  }
  
  // Validações de tamanho, grupo, etc...
  
  const workgroupId = ctx.chat?.id?.toString();
  let rootNode = await getFolderTree(workgroupId);
  
  if (!rootNode) {
    await ctx.reply("🔄 Carregando estrutura de pastas...");
    await updateFolderTree(workgroupId);
    rootNode = await getFolderTree(workgroupId);
  }
  
  const tempId = Date.now().toString(36);
  await setTempData(tempId, {
    mode: 'archive',
    fileId: document.file_id,
    fileName: generateFileName(document, ctx),
    workgroupId
  }, 300);
  
  const keyboard = createFolderNavigationKeyboard(rootNode, tempId);
  
  return ctx.reply(
    `📁 Arquivar: ${fileName}\nEscolha a pasta:`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
}
```

## 🤖 Scheduler Semanal

### 1. Criar arquivo scheduler
```typescript
// scheduler/updateFolderStructures.ts
import { Telegraf } from "telegraf";
import workgroups from "../credentials/workgroupsfolders.json";
import { updateFolderTree } from "../services/folderService";

export async function updateFolderStructures(bot: Telegraf): Promise<void> {
  console.log('[Scheduler] Atualizando estruturas de pastas...');
  
  for (const group of workgroups) {
    try {
      await updateFolderTree(group.value);
      console.log(`[Scheduler] Atualizado: ${group.label}`);
    } catch (error) {
      console.error(`[Scheduler] Erro em ${group.label}:`, error);
    }
  }
  
  console.log('[Scheduler] Atualização de pastas concluída');
}
```

### 2. Adicionar no weekly_frequency_scheduler_index.ts
```typescript
// Importar no topo
import { updateFolderStructures } from "./updateFolderStructures";

// Adicionar no bloco de segunda-feira
if (dayOfWeek === 1) {
  console.log("É segunda-feira! Executando sendWeeklyReport...");
  await sendWeeklyReport(bot);
  
  console.log("Executando updateFolderStructures...");
  await updateFolderStructures(bot);
}
```
```