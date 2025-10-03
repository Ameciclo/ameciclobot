import { Context, Telegraf } from "telegraf";
import { sendChatCompletion } from "../services/azure";
import workgroups from "../credentials/workgroupsfolders.json";
import calendars from "../credentials/calendars.json";
import { buildEventMessage } from "../messages/eventMessages";

// Converte a lista de workgroups para um array de IDs numéricos
const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

function registerEventoCommand(bot: Telegraf) {
  bot.command("evento", async (ctx: Context) => {
    try {
      console.log("[evento] Iniciando comando /evento");
      const chatId = ctx.chat?.id;
      if (!chatId || !ALLOWED_GROUPS.includes(Number(chatId))) {
        console.log("[evento] Chat não autorizado.");
        await ctx.reply(
          "Este comando só pode ser usado nos grupos de trabalho da Ameciclo."
        );
        return;
      }

      // Obtém o texto da mensagem
      let messageText: string | undefined;
      const msg = ctx.message as any;
      if (msg?.reply_to_message?.text) {
        messageText = msg.reply_to_message.text;
        console.log("[evento] Texto obtido da mensagem respondida.");
      } else if (msg?.text) {
        messageText = msg.text.replace("/evento", "").trim();
        console.log("[evento] Texto obtido da própria mensagem.");
      }
      if (!messageText) {
        console.log("[evento] Texto do evento não fornecido.");
        await ctx.reply(
          "Por favor, forneça o texto descritivo do evento (ou responda a uma mensagem com esse texto)."
        );
        return;
      }

      // Obtém a data atual no fuso horário local (GMT-3)
      const nowLocal = new Date();
      console.log("[evento] Data atual:", nowLocal.toISOString());
      const prompt = `Hoje é dia ${nowLocal.toISOString()} e quero que extraia as informações de evento do seguinte texto e retorne APENAS um JSON no formato:
{
  "name": "Título do Evento",
  "startDate": "ISODate",
  "endDate": "ISODate",
  "location": "Local do evento",
  "description": "Descrição completa do evento"
}

Texto:
"${messageText}"`;

      // Envia o prompt para o Azure
      console.log("[evento] Enviando prompt para sendChatCompletion...");
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
        console.log("[evento] Azure não retornou conteúdo.");
        await ctx.reply(
          "Não foi possível obter a resposta formatada. Tente novamente."
        );
        return;
      }

      let eventObject;
      try {
        const cleanedContent = rawContent.replace(/\n/g, "").trim();
        console.log("[evento] Conteúdo limpo:", cleanedContent);
        eventObject = JSON.parse(cleanedContent);
      } catch (parseErr) {
        console.error("[evento] Erro ao fazer parse do JSON:", parseErr);
        await ctx.reply("Não foi possível interpretar o JSON retornado.");
        return;
      }

      // As datas já vêm no formato correto do Azure, não precisa ajustar
      console.log("[evento] Datas mantidas como retornadas pelo Azure:");
      console.log("[evento] startDate:", eventObject.startDate);
      console.log("[evento] endDate:", eventObject.endDate);

      eventObject.from = ctx.from;
      eventObject.workgroup = ctx.chat.id;
      console.log(
        "[evento] JSON final do evento:",
        JSON.stringify(eventObject)
      );

      const jsonMessage =
        "```json\n" + JSON.stringify(eventObject, null, 2) + "\n```";
      const eventMessage =
        buildEventMessage(eventObject) + "\n\n" + jsonMessage;
      console.log("[evento] Mensagem de evento construída.");

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            ...calendars.map((calendar: any, index: number) => [
              {
                text: `➕ ${calendar.name}`,
                callback_data: `add_event_${index}`,
              },
            ]),
            [{ text: "❌ Não adicionar", callback_data: "add_event_skip" }],
          ],
        },
      };

      await ctx.reply(eventMessage, {
        parse_mode: "MarkdownV2",
        ...inlineKeyboard,
      });
      console.log("[evento] Comando /evento concluído com sucesso.");
    } catch (err) {
      console.error("[evento] Erro no comando /evento:", err);
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
