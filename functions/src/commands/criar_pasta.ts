import { Context, Telegraf } from "telegraf";
import { createFolder, checkFolderExists } from "../services/google";
import { updateFolderTree, getWorkgroupConfig } from "../services/folderService";

// Cache para controlar execuções simultâneas
export const executionCache = new Map<string, Promise<any>>();

function sanitizeFolderName(text: string): string {
  return text
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();
}

function registerCriarPastaCommand(bot: Telegraf): void {
  bot.command("criar_pasta", async (ctx: Context): Promise<void> => {
    console.log("[criar_pasta] Comando executado");
    
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Este comando só pode ser utilizado com mensagens de texto.");
      return;
    }

    // Verifica se é grupo configurado
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply("❌ Erro: não foi possível identificar o chat.");
      return;
    }

    const groupConfig = getWorkgroupConfig(chatId);
    if (!groupConfig) {
      await ctx.reply("❌ Este grupo não está configurado para criação de pastas.");
      return;
    }

    // Extrai folderId e nome da pasta do comando
    const messageText = ctx.message.text;
    const args = messageText.replace("/criar_pasta@ameciclobot", "").replace("/criar_pasta", "").trim();
    
    if (!args) {
      await ctx.reply("❌ Uso: `/criar_pasta [folder_id] [nome da pasta]`");
      return;
    }

    const parts = args.split(" ");
    if (parts.length < 2) {
      await ctx.reply("❌ Uso: `/criar_pasta [folder_id] [nome da pasta]`");
      return;
    }

    const folderId = parts[0];
    const folderName = parts.slice(1).join(" ");
    
    if (!folderId || !folderName) {
      await ctx.reply("❌ Folder ID e nome da pasta são obrigatórios.");
      return;
    }

    const sanitizedName = sanitizeFolderName(folderName);
    if (!sanitizedName) {
      await ctx.reply("❌ Nome da pasta inválido.");
      return;
    }

    // Cria chave única para evitar execuções simultâneas
    const executionKey = `${chatId}_${folderId}_${sanitizedName}`;
    
    // Verifica se já existe uma execução em andamento
    if (executionCache.has(executionKey)) {
      console.log(`[criar_pasta] Execução já em andamento para: ${executionKey}`);
      await ctx.reply("⏳ Já existe uma criação de pasta em andamento. Aguarde...");
      return;
    }

    // Cria promise para controlar a execução
    const executionPromise = (async (): Promise<void> => {
      try {
        console.log(`[criar_pasta] Verificando se pasta "${sanitizedName}" já existe em ${folderId}`);
        
        // Verifica se já existe uma pasta com o mesmo nome
        const folderCheck = await checkFolderExists(folderId, sanitizedName);
        
        if (folderCheck.exists) {
          console.log(`[criar_pasta] Pasta "${sanitizedName}" já existe`);
          await ctx.reply(
            `⚠️ Já existe uma pasta com o nome "${sanitizedName}" neste local.\n\n` +
            `📁 ID da pasta existente: ${folderCheck.folderId}`
          );
          return;
        }
        
        console.log(`[criar_pasta] Criando pasta "${sanitizedName}" em ${folderId}`);
        
        // Cria pasta no Google Drive
        const newFolder = await createFolder(sanitizedName, folderId);
        
        if (!newFolder) {
          throw new Error("Erro ao criar pasta no Google Drive");
        }

        console.log(`[criar_pasta] Pasta "${sanitizedName}" criada com sucesso - ID: ${newFolder.id}`);

        // Atualiza cache no Firebase com timeout (não bloqueia se falhar)
        const workgroupId = String(chatId);
        try {
          const updatePromise = updateFolderTree(workgroupId);
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout na atualização")), 30000)
          );
          
          await Promise.race([updatePromise, timeoutPromise]);
        } catch (updateError) {
          console.warn("[criar_pasta] Falha na atualização da árvore (não crítico):", updateError);
        }
        
        await ctx.reply(
          `✅ Pasta "${sanitizedName}" criada com sucesso!\n\n` +
          `📁 ID: ${newFolder.id}\n` +
          `🔄 Use Atualizar para vê-la na navegação.`
        );
        
      } catch (error) {
        console.error("[criar_pasta] Erro ao criar pasta:", error);
        await ctx.reply("❌ Erro ao criar pasta. Verifique se o folder ID é válido.");
      } finally {
        // Remove da cache após execução
        executionCache.delete(executionKey);
      }
    })();

    // Adiciona à cache
    executionCache.set(executionKey, executionPromise);
    
    // Executa a promise
    await executionPromise;
  });
}

// COMANDO OCULTO - não exporta description/help
export const criarPastaCommand = {
  register: registerCriarPastaCommand,
  name: () => "/criar_pasta"
};