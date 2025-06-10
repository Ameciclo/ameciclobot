import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google";
import urls from "../credentials/urls.json";

const MIN_TOPIC_SIZE = 5;

export function getName() {
  return "/comunicacao";
}

export function getHelp() {
  return (
    "Use o comando `/comunicacao` para registrar uma demanda para o grupo de Comunicação\\. Os formatos aceitos são:\\n" +
    "1\\. Com data: `/comunicacao \\[data limite\\] \\[texto da demanda\\]`\\n" +
    "2\\. Sem data: `/comunicacao \\[texto da demanda\\]`\\n" +
    "Exemplos:\\n`/comunicacao 22/09 Criar post para Instagram sobre mobilidade`\\n" +
    "`/comunicacao Criar post para Instagram sobre mobilidade`"
  );
}

export function getDescription() {
  return "📢 Registrar uma demanda para o grupo de Comunicação.";
}

export function register(bot: Telegraf) {
  bot.command("comunicacao", async (ctx: Context) => {
    try {
      console.log("Comando /comunicacao recebido");
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;
      
      console.log("Dados do remetente:", from);
      console.log("Dados do chat:", chat);

      // Verifica se a mensagem possui texto
      let demand: string | undefined;
      if (ctx.message && "text" in ctx.message) {
        demand = ctx.message.text.replace("/comunicacao", "").trim();
        console.log("Texto da demanda extraído:", demand);
      }

      if (!from || !chat || !demand) {
        console.log("Dados incompletos:", { from: !!from, chat: !!chat, demand: !!demand });
        return ctx.reply(getHelp(), {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📝 Ver demandas de comunicação",
                  url: `https://docs.google.com/spreadsheets/d/${urls.communication.id}`,
                },
              ],
            ],
          },
        });
      }

      // Regex para validar o formato: [data opcional] [texto]
      // Formato 1: DD/MM texto
      // Formato 2: texto (sem data)
      const demandRegexWithDate = /^(\d{2}\/\d{2})\s+(.+)$/;
      const demandRegexWithoutDate = /^(.+)$/;
      
      let match = demand.match(demandRegexWithDate);
      let dueDate = "";
      let text = "";
      
      console.log("Tentando validar com data:", { match: !!match, demand });
      
      if (match) {
        // Formato com data
        const [, matchedDueDate, matchedText] = match;
        dueDate = matchedDueDate;
        text = matchedText;
      } else {
        // Tentar formato sem data
        match = demand.match(demandRegexWithoutDate);
        console.log("Tentando validar sem data:", { match: !!match, demand });
        
        if (!match) {
          console.log("Formato inválido da demanda");
          return ctx.reply(
            "Formato inválido! Use o formato:\n`/comunicacao \\[data limite\\] \\[texto da demanda\\]`\nOu sem data:\n`/comunicacao \\[texto da demanda\\]`\nExemplo:\n`/comunicacao 20/12/2023 Criar post para Instagram sobre mobilidade`",
            { parse_mode: "Markdown" }
          );
        }
        
        // Formato sem data, usar data atual + 7 dias como padrão
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 7);
        dueDate = `${String(defaultDueDate.getDate()).padStart(2, '0')}/${String(defaultDueDate.getMonth() + 1).padStart(2, '0')}`;
        const [, matchedText] = match;
        text = matchedText;
        console.log("Usando formato sem data:", { dueDate, text });
      }

      // Validação adicional: verificar número mínimo de palavras no texto da demanda
      console.log("Verificando tamanho do texto:", { text, palavras: text.split(" ").length });
      if (text.split(" ").length < MIN_TOPIC_SIZE) {
        return ctx.reply(
          `${from.first_name}, a descrição da demanda precisa ter pelo menos ${MIN_TOPIC_SIZE} palavras. Descreva melhor e tente novamente.`
        );
      }

      // Prepara os dados para registro
      const date = new Date().toLocaleString();
      const group =
        chat.type === "group" || chat.type === "supergroup"
          ? chat.title
          : "Privado";
      const author = `${from.first_name} ${from.last_name || ""}`;
      const recipients = "Grupo Comunicação";

      // Salva na planilha usando o serviço do Google Sheets
      const success = await appendSheetRowAsPromise(
        urls.communication.id,
        urls.communication.range + urls.communication.offset,
        [date, group, author, dueDate, recipients, text]
      );

      if (success) {
        return ctx.reply(
          `Valeu, ${from.first_name}! Demanda de comunicação registrada com sucesso! Veja na planilha:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver demandas de comunicação",
                    url: `https://docs.google.com/spreadsheets/d/${urls.communication.id}`,
                  },
                ],
              ],
            },
          }
        );
      } else {
        return ctx.reply(
          "Houve um erro ao salvar a demanda. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("Erro ao processar comando /comunicacao:", error);
      console.error("Detalhes do erro:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return ctx.reply(
        "Ocorreu um erro ao registrar sua demanda de comunicação. Tente novamente mais tarde."
      );
    }
  });
}

export const comunicacaoCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};