import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../credentials/urls.json";

const MIN_TOPIC_SIZE = 5;

function registerPautaCommand(bot: Telegraf) {
  bot.command("pauta", async (ctx: Context) => {
    try {
      console.log("[pauta] Comando /pauta executado");
      console.log("[pauta] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
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
        return ctx.reply(pautaCommand.help(), {
          parse_mode: "Markdown",
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
        });
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
        console.log(`[pauta] Pauta registrada com sucesso por ${from.first_name}: "${topic}"`);
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
        console.error("[pauta] Erro ao salvar pauta na planilha");
        return ctx.reply(
          "Houve um erro ao salvar a pauta. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("[pauta] Erro ao processar comando /pauta:", error);
      return ctx.reply(
        "Ocorreu um erro ao registrar sua pauta. Tente novamente mais tarde."
      );
    }
  });
}

export const pautaCommand = {
  register: registerPautaCommand,
  name: () => "/pauta",
  help: () => "Use o comando `/pauta` para adicionar uma pauta\\. O formato esperado é:\n`/pauta \\[texto com pelo menos 5 palavras\\]`\nVocê também pode dar /pauta em resposta a alguma mensagem sua ou de outra pessoa\\.",
  description: () => "📝 Adicionar uma pauta para a reunião ordinária.",
};
