// src/commands/evento.ts
import { Context, Telegraf } from "telegraf";
import { sendChatCompletion } from "../services/azure";
import workgroups from "../credentials/workgroupsfolders.json";
import calendars from "../credentials/calendars.json";
import { buildEventMessage } from "../messages/eventMessages";

// Converte a lista de workgroups para um array de IDs numéricos
const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

export function registerEventoCommand(bot: Telegraf) {
  bot.command("evento", async (ctx: Context) => {
    try {
      const chatId = ctx.chat?.id;
      if (!chatId || !ALLOWED_GROUPS.includes(Number(chatId))) {
        await ctx.reply(
          "Este comando só pode ser usado nos grupos de trabalho da Ameciclo."
        );
        return;
      }

      // Obtém o texto da mensagem (seja da mensagem respondida ou após o comando)
      let messageText: string | undefined;
      const msg = ctx.message as any;
      if (msg?.reply_to_message?.text) {
        messageText = msg.reply_to_message.text;
      } else if (msg?.text) {
        messageText = msg.text.replace("/evento", "").trim();
      }
      if (!messageText) {
        await ctx.reply(
          "Por favor, forneça o texto descritivo do evento (ou responda a uma mensagem com esse texto)."
        );
        return;
      }

      const prompt = `Hoje é dia ${new Date()} e quero que extraia as informações de evento do seguinte texto e retorne APENAS um JSON no formato:
{
  "name": "Título do Evento",
  "startDate": "ISODate",
  "endDate": "ISODate",
  "location": "Local do evento",
  "description": "Descrição completa do evento"
}

Texto:
"${messageText}"`;

      const azureResponse = await sendChatCompletion([
        {
          role: "system",
          content:
            "Você é um assistente da Ameciclo, a Associação Metropolitana de Ciclistas do Recife, que extrai informações de eventos e retorna APENAS um JSON estruturado.",
        },
        { role: "user", content: prompt },
      ]);

      const rawContent = azureResponse.choices?.[0]?.message?.content;
      if (!rawContent) {
        await ctx.reply(
          "Não foi possível obter a resposta formatada. Tente novamente."
        );
        return;
      }

      let eventObject;
      try {
        const cleanedContent = rawContent.replace(/\n/g, "").trim();
        eventObject = JSON.parse(cleanedContent);
      } catch (parseErr) {
        console.error("Erro ao fazer parse do JSON:", parseErr);
        await ctx.reply("Não foi possível interpretar o JSON retornado.");
        return;
      }

      eventObject.from = ctx.from;
      eventObject.workgroup = ctx.chat.id;

      const jsonMessage =
        "```json\n" + JSON.stringify(eventObject, null, 2) + "\n```";
      // Formata a mensagem do evento usando a função centralizada
      const eventMessage =
        buildEventMessage(eventObject) + "\n\n" + jsonMessage;

      // Constrói o teclado inline usando o índice dos calendários
      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            calendars.map((calendar: any, index: number) => ({
              text: `➕ ${calendar.name}`,
              callback_data: `add_event_${index}`,
            })),
            [{ text: "❌ Não adicionar", callback_data: "add_event_skip" }],
          ],
        },
      };

      // Envia a mensagem com o evento formatado e os botões
      await ctx.reply(eventMessage, {
        parse_mode: "MarkdownV2",
        ...inlineKeyboard,
      });
    } catch (err) {
      console.error("Erro no comando /evento:", err);
      await ctx.reply("Ocorreu um erro ao processar o evento.");
    }
  });
}

export const eventoCommand = {
  register: registerEventoCommand,
  name: () => "/evento",
  help: () =>
    "Use o comando `/evento` em resposta a uma mensagem de texto descritiva, ou digitando `/evento [texto descritivo]` para gerar um evento formatado em JSON.",
  description: () => "📅 Criar evento a partir de descrição.",
};
