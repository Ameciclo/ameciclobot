// src/callbacks/modeloCallbacks.ts
import { Context, Telegraf } from "telegraf";
import {
  copyFile,
  getFileMetadata
} from "../services/google";
import { getTempData, setTempData } from "../services/firebase";
import { createFolderNavigationKeyboard } from "./folderNavigationCallback";
import { getOrCacheFolderLevel, getWorkgroupConfig } from "../services/folderService";
import { getPreviewTitle } from "../utils/utils";

export function registerModeloUseCallback(bot: Telegraf) {
  bot.action(/modelo_(.+)_(.+)/, async (ctx: Context) => {
    try {
      const match = (ctx as any).match;
      if (!match) {
        await ctx.answerCbQuery("Erro: Dados inválidos.");
        return;
      }
      const [, templateId, tempId] = match;
      
      const data = await getTempData(tempId);
      if (!data) {
        return ctx.answerCbQuery("Dados expirados");
      }

      const { newTitle, parentFolderId } = data;
      const workgroupId = data.workgroupId || String(ctx.chat?.id);

      // Obtém os metadados do modelo
      const metadata = await getFileMetadata(templateId);
      const fullTitle = getPreviewTitle(metadata.name || "", newTitle);

      // Copia o arquivo modelo
      const copied = await copyFile(templateId, fullTitle);
      const documentId = copied.documentId || copied.id;
      if (!documentId) {
        throw new Error("Não foi possível obter o ID do documento criado.");
      }

      const groupConfig = getWorkgroupConfig(workgroupId);
      if (!groupConfig) {
        return ctx.editMessageText("❌ Grupo não configurado.");
      }

      // Atualiza dados temporários com informações do documento criado
      await setTempData(tempId, {
        ...data,
        mode: "create",
        documentId,
        parentFolderId,
        workgroupId,
        breadcrumb: [],
        currentFolderId: groupConfig.folderId,
        documentType: "Documento",
        documentTitle: fullTitle
      }, 300);

      let rootNode = await getOrCacheFolderLevel(workgroupId, groupConfig.folderId, groupConfig.label);
      if (!rootNode) {
        await ctx.editMessageText("🔄 Carregando estrutura de pastas...");
        rootNode = await getOrCacheFolderLevel(workgroupId, groupConfig.folderId, groupConfig.label, true);

        if (!rootNode) {
          return ctx.editMessageText("❌ Erro ao carregar estrutura de pastas.");
        }
      }

      const keyboard = createFolderNavigationKeyboard(rootNode, tempId);
      const createCommand = `/criar_pasta ${groupConfig.folderId} [nome da pasta]`;
      
      await ctx.editMessageText(
        `Para criar pasta: <code>${createCommand}</code>\n\nDocumento "${fullTitle}" criado com sucesso!\nEscolha onde salvá-lo:`,
        { reply_markup: { inline_keyboard: keyboard }, parse_mode: "HTML" }
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Erro ao criar documento a partir do modelo:", error);
      await ctx.reply(
        "Ocorreu um erro ao criar o documento a partir do modelo."
      );
    }
    return;
  });

  // Callback para modelos antigos sem tempId (compatibilidade)
  bot.action(/^modelo_([^_]+)$/, async (ctx: Context) => {
    await ctx.answerCbQuery("Por favor, execute o comando /modelo novamente para usar a nova versão.");
  });
}
