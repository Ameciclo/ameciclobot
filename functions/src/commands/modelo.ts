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

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = ("0" + (date.getMonth() + 1)).slice(-2);
  const dd = ("0" + date.getDate()).slice(-2);
  return `${yyyy}.${mm}.${dd}`;
}

export async function register(bot: Telegraf) {
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
    const todayFormatted = formatDate(new Date());
    const finalTitle = `${todayFormatted} - ${newTitleProvided}`;
    // Monta a mensagem que será exibida
    const textMessage = `Qual o modelo de documento você quer clonar?\nTítulo do documento: ${finalTitle}`;
    try {
      const models = await listModelsFromFolder(
        "1xYWUMDsamike4q3_CrHAZNKNsq6gsUUb"
      );
      if (!models || models.length === 0) {
        await ctx.reply("Nenhum modelo disponível.");
        return;
      }
      // Gera os botões – a callback_data inclui apenas o templateId
      const buttons = models.map((model) => {
        return [{ text: model.name, callback_data: `modelo_${model.id}` }];
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
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
