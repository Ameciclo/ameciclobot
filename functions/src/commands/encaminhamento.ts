import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../credentials/urls.json";

const MIN_TOPIC_SIZE = 5;

export function getName() {
  return "/encaminhamento";
}

export function getHelp() {
  return "Use o comando `/encaminhamento` para registrar encaminhamentos\\. O formato esperado é:\n`/encaminhamento \\[texto do encaminhamento com pelo menos 5 palavras\\]`";
}

export function getDescription() {
  return "🔄 Registrar encaminhamentos importantes.";
}

export function register(bot: Telegraf) {
  bot.command("encaminhamento", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      // Verifica se a mensagem possui texto ou se está respondendo a uma mensagem com texto
      let referrals: string | undefined;
      if (ctx.message && "text" in ctx.message) {
        referrals =
          ctx.message.reply_to_message && "text" in ctx.message.reply_to_message
            ? ctx.message.reply_to_message.text
            : ctx.message.text.replace("/encaminhamento", "").trim();
      }

      if (!from || !chat || !referrals) {
        return ctx.reply(getHelp());
      }

      // Validação: verifica se a pauta tem pelo menos MIN_TOPIC_SIZE palavras
      if (referrals.split(" ").length < MIN_TOPIC_SIZE) {
        return ctx.reply(
          `${from.first_name}, menos de ${MIN_TOPIC_SIZE} palavras? Descreve um pouco mais o que você quer e tente novamente.`
        );
      }

      // Prepara os dados para registro
      const date = new Date().toLocaleString();
      const group =
        chat.type === "group" || chat.type === "supergroup"
          ? chat.title
          : "Privado";
      const author = `${from.first_name} ${from.last_name || ""}`;

      // Salva na planilha usando o serviço do Google Sheets
      const success = await appendSheetRowAsPromise(
        urls.referrals.id,
        urls.referrals.range + urls.referrals.offset,
        [date, group, author, referrals]
      );

      if (success) {
        return ctx.reply(
          `Valeu, ${from.first_name}! Registrado com sucesso! Veja na planilha:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver encaminhamentos",
                    url: `https://docs.google.com/spreadsheets/d/${urls.referrals.id}`,
                  },
                ],
              ],
            },
          }
        );
      } else {
        return ctx.reply(
          "Houve um erro ao salvar o encaminhamento. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("Erro ao processar comando /encaminhamento:", error);
      return ctx.reply(
        "Ocorreu um erro ao registrar sua encaminhamento. Tente novamente mais tarde."
      );
    }
  });
}

export const encaminhamentoCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
