// calendarActions.ts
import { Context, Telegraf, Markup } from "telegraf";
import {
  getCalendarEventData,
  updateCalendarEventData,
} from "../services/firebase";

/**
 * Função que registra o handler para o callback "Eu vou"
 * Exemplo de callback_data: eu_vou_<EVENT_ID>
 */
export function registerCalendarHandler(bot: Telegraf) {
  bot.action(/^eu_vou_(.+)$/, async (ctx: Context) => {
    console.log("CONFIRMAR PRESENÇA NO EVENTO!");
    try {
      const callbackQuery = ctx.callbackQuery;
      // Verifica se a callbackQuery é válida
      if (
        !callbackQuery ||
        !("data" in callbackQuery) ||
        typeof callbackQuery.data !== "string"
      ) {
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data; // ex: "eu_vou_123abc"
      // Extraímos o ID do evento (tudo após "eu_vou_")
      // Você pode usar regex diretamente (ctx.match[1]) ou split:
      //const eventId = ctx.match?.[1]; // se usar regex no bot.action()
      const parts = callbackData.split("_"); // ["eu", "vou", "123abc"]
      const eventId = parts[2]; // "123abc"

      // Pega o objeto da mensagem (enviada no Telegram)
      const message = callbackQuery.message;
      if (!message || !("text" in message)) {
        console.error("Mensagem inválida ou sem texto.");
        return;
      }

      // Carrega os dados do evento a partir do Firebase (ajuste para sua função real)
      // Essa função deve retornar algo do tipo:
      // {
      //   name: string;
      //   participants?: Record<string, { id: string; first_name: string }>;
      //   ...
      // }
      const eventData = await getCalendarEventData(eventId);
      if (!eventData) {
        await ctx.answerCbQuery("Evento não encontrado.", { show_alert: true });
        return;
      }

      // Participantes (semelhante ao "signatures" do exemplo de pagamento)
      const participants = eventData.participants || {};

      // Identificador do usuário que clicou
      const userId = ctx.from?.id?.toString();
      if (!userId) {
        await ctx.answerCbQuery("Usuário não identificado.", {
          show_alert: true,
        });
        return;
      }

      // Verifica se o usuário já está na lista de participantes
      const userAlreadyIn = Object.values(participants).some(
        (p: any) => p.id === userId
      );

      // Se o usuário já estiver confirmado, remove (toggle)
      if (userAlreadyIn) {
        // Encontrar a chave em participants
        const keyToRemove = Object.keys(participants).find(
          (key) => participants[key].id === userId
        );
        if (keyToRemove) {
          delete participants[keyToRemove];
        }
        await updateCalendarEventData(eventId, { participants });
        await ctx.answerCbQuery("Você retirou sua presença do evento.");
      } else {
        // Senão, adiciona
        const newKey = userId; // ou um UUID se preferir
        participants[newKey] = {
          id: userId,
          first_name: ctx.from?.first_name || "Usuário",
        };
        await updateCalendarEventData(eventId, { participants });
        await ctx.answerCbQuery("Presença confirmada com sucesso!");
      }

      // Monta a lista atualizada de participantes para exibir na mensagem
      const participantsList = Object.values(participants)
        .map((p: any) => `✅ ${p.first_name}`)
        .join("\n");

      // Texto original da mensagem
      const messageText = message.text;
      // Ajuste conforme queira exibir as infos do evento:
      // Ex.: "Evento X\nData Y...\nParticipantes confirmados:..."
      const newText = `${messageText}\n\n**Participantes confirmados:**\n${participantsList}`;

      // Mantém (ou redefine) os botões
      // Exemplo: só um botão "Eu vou" (toggle)
      // Se quiser "cancelar", etc., faça outro callback
      const newMarkup = Markup.inlineKeyboard([
        [Markup.button.callback("Eu vou", `eu_vou_${eventId}`)],
      ]);

      // Edita a mensagem original com o novo texto e a nova lista de participantes
      await ctx.editMessageText(newText, {
        parse_mode: "Markdown",
        reply_markup: newMarkup.reply_markup,
      });
    } catch (err) {
      console.error("Erro ao confirmar presença no evento:", err);
      await ctx.reply("Ocorreu um erro ao processar seu pedido de presença.");
    }
  });
}
