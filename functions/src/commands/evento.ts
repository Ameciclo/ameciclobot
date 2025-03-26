// src/commands/evento.ts
import { Context, Telegraf } from "telegraf";
import { sendChatCompletion } from "../services/azure";
import workgroups from "../credentials/workgroupsfolders.json";

// Transforma a lista de workgroups em um array de IDs (números ou strings)
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

      // Tenta pegar o texto da mensagem respondida
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

      const prompt = `Extraia as informações de evento do seguinte texto e retorne APENAS um JSON no formato:
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
            "Você é um assistente que extrai informações de eventos e retorna APENAS um JSON estruturado.",
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

      try {
        const cleanedContent = rawContent.replace(/\n/g, "").trim();
        const eventObject = JSON.parse(cleanedContent);
        const jsonMessage =
          "```json\n" + JSON.stringify(eventObject, null, 2) + "\n```";
        await ctx.reply(jsonMessage, { parse_mode: "MarkdownV2" });
      } catch (parseErr) {
        console.error("Erro ao fazer parse do JSON:", parseErr);
        await ctx.reply("Não foi possível interpretar o JSON retornado.");
      }
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
