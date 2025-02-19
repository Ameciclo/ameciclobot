// src/commands/modelo.ts
import { Context, Telegraf, Markup } from "telegraf";
import { listModelsFromFolder } from "../services/google";

export function getName() {
  return "/modelo";
}

export function getHelp() {
  return "Use o comando `/modelo Título do documento` para criar um documento a partir de um modelo. O bot listará os modelos disponíveis na pasta.";
}

export function getDescription() {
  return "📄 Criar documento a partir de modelo disponível.";
}

export function register(bot: Telegraf) {
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
    const newTitleProvided = args.join(" ");
    try {
      const models = await listModelsFromFolder(
        "1xYWUMDsamike4q3_CrHAZNKNsq6gsUUb"
      );
      if (!models || models.length === 0) {
        await ctx.reply("Nenhum modelo disponível.");
        return;
      }
      const buttons = models.map((model) => {
        // Usamos encodeURIComponent para evitar problemas na callback_data
        return [
          {
            text: model.name,
            callback_data: `modelo_${model.id}_${encodeURIComponent(
              newTitleProvided
            )}`,
          },
        ];
      });
      await ctx.reply("Escolha um modelo:", Markup.inlineKeyboard(buttons));
    } catch (error) {
      console.error("Erro ao listar modelos:", error);
      await ctx.reply("Ocorreu um erro ao listar os modelos.");
    }
  });
}

export const modeloCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
