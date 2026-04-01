import { Context, Telegraf } from "telegraf";
import { buildEventButtons, buildEventMessage } from "../utils/eventMessages";
import {
  extractEventIdFromText,
  formatExtraParticipantsSummary,
  registerExtraParticipants,
} from "../services/eventParticipants";

function getReplyText(ctx: Context): string | undefined {
  if (!ctx.message || !("reply_to_message" in ctx.message)) {
    return undefined;
  }

  const replyMessage = ctx.message.reply_to_message;
  if (!replyMessage) {
    return undefined;
  }

  if ("text" in replyMessage && replyMessage.text) {
    return replyMessage.text;
  }

  if ("caption" in replyMessage && replyMessage.caption) {
    return replyMessage.caption;
  }

  return undefined;
}

function getCommandPayload(text: string | undefined): string {
  return (text || "").replace(/\/presentes(@\w+)?/i, "").trim();
}

function registerPresentesCommand(bot: Telegraf) {
  bot.command("presentes", async (ctx: Context) => {
    try {
      if (!ctx.message || !("reply_to_message" in ctx.message) || !ctx.message.reply_to_message) {
        await ctx.reply(
          "Use /presentes respondendo à mensagem do evento, seguido da lista de participantes separados por vírgula ou ENTER."
        );
        return;
      }

      const commandText =
        ctx.message && "text" in ctx.message ? ctx.message.text : "";
      const payload = getCommandPayload(commandText);

      if (!payload) {
        await ctx.reply(
          "Informe os participantes após o comando. Exemplo:\n/presentes Ana, João\nMaria"
        );
        return;
      }

      const repliedText = getReplyText(ctx);
      const eventId = extractEventIdFromText(repliedText);

      if (!eventId) {
        await ctx.reply(
          "Não consegui identificar o ID do evento na mensagem respondida. Use /evento <ID> presentes ... como alternativa."
        );
        return;
      }

      const result = await registerExtraParticipants(eventId, payload, ctx.from!);
      const summary = formatExtraParticipantsSummary(result.added, result.duplicates);

      if (result.eventData.workgroup && result.eventData.groupMessageId) {
        try {
          await ctx.telegram.editMessageText(
            result.eventData.workgroup,
            result.eventData.groupMessageId,
            undefined,
            buildEventMessage(result.eventData),
            {
              parse_mode: "MarkdownV2",
              reply_markup: buildEventButtons(result.eventData).reply_markup,
            }
          );
        } catch (error) {
          console.error("[presentes] Erro ao atualizar mensagem do evento:", error);
        }
      }

      await ctx.reply(summary || "Nenhum participante novo foi adicionado.");
    } catch (error: any) {
      if (error?.message === "EVENT_NOT_FOUND") {
        await ctx.reply("Evento não encontrado.");
        return;
      }

      if (error?.message === "NO_PARTICIPANTS") {
        await ctx.reply("Nenhum participante válido foi informado.");
        return;
      }

      console.error("[presentes] Erro ao registrar participantes:", error);
      await ctx.reply("Ocorreu um erro ao registrar os participantes.");
    }
  });
}

export const presentesCommand = {
  register: registerPresentesCommand,
  name: () => "/presentes",
  help: () =>
    "Use `/presentes` respondendo à mensagem de um evento e informe os participantes separados por vírgula ou ENTER\\. Exemplo: `/presentes Ana, João`.",
  description: () => "👥 Registra participantes extras em um evento.",
};
