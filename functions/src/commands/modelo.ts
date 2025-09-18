// src/commands/modelo.ts
import { Context, Telegraf, Markup } from "telegraf";
import { listModelsFromFolder } from "../services/google";
import { setTempData } from "../services/firebase";
import { getPreviewTitle } from "../utils/utils";
import workgroups from "../credentials/workgroupsfolders.json";

async function registerModeloCommand(bot: Telegraf) {
  bot.command("modelo", async (ctx: Context) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Este comando só pode ser usado com mensagens de texto.");
      return;
    }
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length === 0) {
      await ctx.reply(
        "Por favor, forneça o Título do documento.\nExemplo: `/modelo Relatório Mensal`"
      );
      return;
    }
    // Utiliza apenas o título informado, sem data, deixando para o callback adicionar a data atual.
    const newTitleProvided = args.join(" ");
    // Monta a mensagem exibida para o usuário
    const textMessage = `Qual o modelo de documento você quer clonar?\nTítulo do documento: ${newTitleProvided}`;
    try {
      const models = await listModelsFromFolder(
        "1xYWUMDsamike4q3_CrHAZNKNsq6gsUUb"
      );
      if (!models || models.length === 0) {
        await ctx.reply("Nenhum modelo disponível.");
        return;
      }

      // Identifica o grupo de trabalho
      const chat = ctx.message?.chat;
      if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
        return ctx.reply("O comando /modelo deve ser usado em um grupo de trabalho.");
      }
      
      const groupConfig = workgroups.find(
        (group: any) => group.value === String(chat.id)
      );
      if (!groupConfig) {
        return ctx.reply("Este grupo não possui uma pasta configurada.");
      }

      // Cria ID temporário e salva dados
      const tempId = Date.now().toString(36);
      await setTempData(tempId, {
        newTitle: newTitleProvided,
        parentFolderId: groupConfig.folderId,
        documentType: "Documento"
      }, 300);

      // Gera os botões para cada modelo
      const buttons = models.map((model) => {
        return [
          {
            text: getPreviewTitle(model.name, newTitleProvided),
            callback_data: `modelo_${model.id}_${tempId}`,
          },
        ];
      });
      await ctx.reply(textMessage, Markup.inlineKeyboard(buttons));
    } catch (error) {
      console.error("Erro ao listar modelos:", error);
      await ctx.reply("Ocorreu um erro ao listar os modelos.");
    }
    return;
  });
}

export const modeloCommand = {
  register: registerModeloCommand,
  name: () => "/modelo",
  help: () => "Use o comando `/modelo Título do documento` para criar um documento a partir de um modelo\\. O bot listará os modelos disponíveis na pasta\\.",
  description: () => "📄 Criar documento a partir de modelo disponível.",
};