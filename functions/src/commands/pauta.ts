import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../credentials/urls.json";

const MIN_TOPIC_SIZE = 5;

export function getName() {
  return "/pauta";
}

export function getHelp() {
  return "Use o comando `/pauta` para adicionar uma pauta. O formato esperado é:\n\n`/pauta [texto com pelo menos 5 palavras]`\n\nVocê também pode dar /pauta em resposta a alguma mensagem sua ou de outra pessoa.";
}

export function getDescription() {
  return "📝 Adicionar uma pauta para a reunião ordinária.";
}

export function register(bot: Telegraf) {
  bot.command("pauta", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      // Verifica se a mensagem possui texto ou se está respondendo a uma mensagem com texto
      let topic: string | undefined;
      if (ctx.message && "text" in ctx.message) {
        topic =
          ctx.message.reply_to_message && "text" in ctx.message.reply_to_message
            ? ctx.message.reply_to_message.text
            : ctx.message.text.replace("/pauta", "").trim();
      }

      if (!from || !chat || !topic) {
        return ctx.reply(getHelp());
      }

      // Validação: verifica se a pauta tem pelo menos MIN_TOPIC_SIZE palavras
      if (topic.split(" ").length < MIN_TOPIC_SIZE) {
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
        urls.topics.id,
        urls.topics.range + urls.topics.offset,
        [date, group, author, topic]
      );

      if (success) {
        return ctx.reply(
          `Valeu, ${from.first_name}! Registrado com sucesso! Veja na planilha:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver pautas",
                    url: `https://docs.google.com/spreadsheets/d/${urls.topics.id}`,
                  },
                ],
              ],
            },
          }
        );
      } else {
        return ctx.reply(
          "Houve um erro ao salvar a pauta. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("Erro ao processar comando /pauta:", error);
      return ctx.reply(
        "Ocorreu um erro ao registrar sua pauta. Tente novamente mais tarde."
      );
    }
  });
}

export const pautaCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
