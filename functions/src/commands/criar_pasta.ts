import { Context, Telegraf } from "telegraf";
import { createFolder } from "../services/google";
import { updateFolderTree, getWorkgroupConfig } from "../services/folderService";

function sanitizeFolderName(text: string): string {
  return text
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();
}

function registerCriarPastaCommand(bot: Telegraf) {
  bot.command("criar_pasta", async (ctx: Context) => {
    console.log("[criar_pasta] Comando executado");
    
    if (!ctx.message || !("text" in ctx.message)) {
      return ctx.reply("Este comando só pode ser utilizado com mensagens de texto.");
    }

    // Verifica se é grupo configurado
    const chatId = ctx.chat?.id;
    if (!chatId) {
      return ctx.reply("❌ Erro: não foi possível identificar o chat.");
    }

    const groupConfig = getWorkgroupConfig(chatId);
    if (!groupConfig) {
      return ctx.reply("❌ Este grupo não está configurado para criação de pastas.");
    }

    // Extrai folderId e nome da pasta do comando
    const messageText = ctx.message.text;
    const args = messageText.replace("/criar_pasta@ameciclobot", "").replace("/criar_pasta", "").trim();
    
    if (!args) {
      return ctx.reply("❌ Uso: `/criar_pasta [folder_id] [nome da pasta]`");
    }

    const parts = args.split(" ");
    if (parts.length < 2) {
      return ctx.reply("❌ Uso: `/criar_pasta [folder_id] [nome da pasta]`");
    }

    const folderId = parts[0];
    const folderName = parts.slice(1).join(" ");
    
    if (!folderId || !folderName) {
      return ctx.reply("❌ Folder ID e nome da pasta são obrigatórios.");
    }

    const sanitizedName = sanitizeFolderName(folderName);
    if (!sanitizedName) {
      return ctx.reply("❌ Nome da pasta inválido.");
    }

    try {
      console.log(`[criar_pasta] Criando pasta "${sanitizedName}" em ${folderId}`);
      
      // Cria pasta no Google Drive
      const newFolder = await createFolder(sanitizedName, folderId);
      
      if (!newFolder) {
        return ctx.reply("❌ Erro ao criar pasta no Google Drive.");
      }

      // Atualiza cache no Firebase
      const workgroupId = String(chatId);
      await updateFolderTree(workgroupId);
      
      console.log(`[criar_pasta] Pasta "${sanitizedName}" criada com sucesso`);
      
      return ctx.reply(
        `✅ Pasta "${sanitizedName}" criada com sucesso!\n\nUse 🔄 Atualizar para vê-la na navegação.`
      );
      
    } catch (error) {
      console.error("[criar_pasta] Erro ao criar pasta:", error);
      return ctx.reply("❌ Erro ao criar pasta. Verifique se o folder ID é válido.");
    }
  });
}

// COMANDO OCULTO - não exporta description/help
export const criarPastaCommand = {
  register: registerCriarPastaCommand,
  name: () => "/criar_pasta"
};