import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../credentials/urls.json";

const URL_REGEX = /(https?:\/\/[^\s]+)/; // Regex para capturar URLs

// Exemplo para o comando /clipping
export function getName() {
  return "/clipping";
}

export function getHelp() {
  return "Use o comando `/clipping` para adicionar um link de clipping. O formato esperado é:\n\n`/clipping [URL válida]`\n\nVocê também pode dar /clipping em resposta a alguma mensagem sua ou de outra pessoa.";
}

export function getDescription() {
  return "🔗 Adicionar um link de clipping.";
}

export function register(bot: Telegraf) {
  bot.command("clipping", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      // Verifica se a mensagem possui texto ou se está respondendo a uma mensagem com texto
      let clip: string | undefined;
      if (ctx.message && "text" in ctx.message) {
        clip =
          ctx.message.reply_to_message && "text" in ctx.message.reply_to_message
            ? ctx.message.reply_to_message.text
            : ctx.message.text.replace("/clipping", "").trim();
      }

      if (!clip) {
        return ctx.reply(getHelp(), {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📝 Ver clippings",
                  url: `https://docs.google.com/spreadsheets/d/${urls.clipping.id}`,
                },
              ],
            ],
          },
        });
      }

      const urlMatch = clip.match(URL_REGEX);
      if (!urlMatch) {
        return ctx.reply(
          `${from?.first_name}, não encontrei uma URL válida no texto. Certifique-se de enviar um link para registrar como clipping.`
        );
      }

      if (!from || !chat) {
        return ctx.reply("Por favor, envie uma mensagem válida.");
      }

      const url = urlMatch[0]; // Extrai a URL válida do texto

      // Prepara os dados para registro
      const date = new Date().toLocaleString();
      const group =
        chat.type === "group" || chat.type === "supergroup"
          ? chat.title
          : "Privado";
      const author = `${from?.first_name} ${from?.last_name || ""}`;

      // Salva na planilha usando o serviço do Google Sheets
      const success = await appendSheetRowAsPromise(
        urls.clipping.id,
        urls.clipping.range + urls.clipping.offset,
        [date, group, author, url]
      );

      if (success) {
        return ctx.reply(
          `Valeu, ${from.first_name}! Registrado com sucesso! Veja na planilha:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver clippings",
                    url: `https://docs.google.com/spreadsheets/d/${urls.clipping.id}`,
                  },
                ],
              ],
            },
          }
        );
      } else {
        return ctx.reply(
          "Houve um erro ao salvar a clipping. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("Erro ao processar comando /clipping:", error);
      return ctx.reply(
        "Ocorreu um erro ao registrar sua clipping. Tente novamente mais tarde."
      );
    }
  });
}

export const clippingCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
