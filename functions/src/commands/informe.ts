import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../credentials/urls.json";

const MIN_TOPIC_SIZE = 5;

export function getName() {
  return "/informe";
}

export function getHelp() {
  return "Use o comando `/informe` para registrar um informe\\. O formato esperado é:\n`/informe \\[texto com pelo menos 5 palavras\\]`\nVocê também pode dar /informe em resposta a alguma mensagem sua ou de outra pessoa\\.";
}

export function getDescription() {
  return "📢 Registrar um informe.";
}

export function register(bot: Telegraf) {
  bot.command("informe", async (ctx: Context) => {
    try {
      console.log("[informe] Comando /informe executado");
      console.log("[informe] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      // Verifica se a mensagem possui texto ou se está respondendo a uma mensagem com texto
      let inform: string | undefined;
      if (ctx.message && "text" in ctx.message) {
        inform =
          ctx.message.reply_to_message && "text" in ctx.message.reply_to_message
            ? ctx.message.reply_to_message.text
            : ctx.message.text.replace("/informe", "").trim();
      }

      if (!from || !chat || !inform) {
        return ctx.reply(getHelp(), {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📝 Ver informes",
                  url: `https://docs.google.com/spreadsheets/d/${urls.information.id}`,
                },
              ],
            ],
          },
        });
      }

      // Validação: verifica se a informe tem pelo menos MIN_TOPIC_SIZE palavras
      if (inform.split(" ").length < MIN_TOPIC_SIZE) {
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
        urls.information.id,
        urls.information.range + urls.information.offset,
        [date, group, author, inform]
      );

      if (success) {
        console.log(`[informe] Informe registrado com sucesso por ${from.first_name}: "${inform}"`);
        return ctx.reply(
          `Valeu, ${from.first_name}! Registrado com sucesso! Veja na planilha:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver informes",
                    url: `https://docs.google.com/spreadsheets/d/${urls.information.id}`,
                  },
                ],
              ],
            },
          }
        );
      } else {
        console.error("[informe] Erro ao salvar informe na planilha");
        return ctx.reply(
          "Houve um erro ao salvar a informe. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("[informe] Erro ao processar comando /informe:", error);
      return ctx.reply(
        "Ocorreu um erro ao registrar sua informe. Tente novamente mais tarde."
      );
    }
  });
}

export const informeCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
