import { Context, Telegraf } from "telegraf";
import { getEventById, addEventAttachment } from "../../services/google";
import { uploadInvoice } from "../../services/google";
import { formatDate } from "../../utils/utils";
import calendars from "../../credentials/calendars.json";

function sanitizeFileName(text: string, maxLength = 50): string {
  const sanitized = text
    .replace(/[\\/:*?\"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();

  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

async function updateEventDescription(
  eventId: string,
  newDescription: string
): Promise<boolean> {
  const { getEventById } = require("../services/google");
  const { google } = require("googleapis");
  const { getJwt } = require("../services/google");

  const auth = getJwt();
  const calendar = google.calendar({ version: "v3", auth });

  // Busca o evento usando a função que resolve IDs do Firebase
  const event = await getEventById(eventId);
  if (!event) {
    console.error(`Evento ${eventId} não encontrado para atualizar descrição`);
    return false;
  }

  // Encontra o calendário correto e atualiza
  for (const calendarConfig of calendars) {
    try {
      await calendar.events.update({
        calendarId: calendarConfig.id,
        eventId: event.id,
        requestBody: {
          ...event,
          description: newDescription,
        },
      });

      console.log(`Descrição do evento ${event.id} atualizada`);
      return true;
    } catch (error) {
      continue;
    }
  }

  return false;
}

export async function registerComplementarEventoCommand(bot: Telegraf) {
  bot.command("complementar_evento", async (ctx: Context) => {
    try {
      if (
        !ctx.message ||
        !("reply_to_message" in ctx.message) ||
        !ctx.message.reply_to_message
      ) {
        await ctx.reply(
          "Este comando deve ser usado como resposta a uma mensagem com texto (nova descrição) ou imagem (para ilustrar o evento)."
        );
        return;
      }

      const text = ctx.text || "";
      const match = text.match(
        /\/complementar_evento(?:@\w+)?\s+([a-zA-Z0-9_-]+)/
      );

      if (!match || !match[1]) {
        await ctx.reply(
          "Formato incorreto. Use: /complementar_evento [id do evento]"
        );
        return;
      }

      const eventId = match[1];
      const event = await getEventById(eventId);

      if (!event) {
        await ctx.reply(`Evento com ID ${eventId} não encontrado.`);
        return;
      }

      const replyMessage = ctx.message.reply_to_message;

      // Se a mensagem respondida tem texto, atualiza a descrição
      if ("text" in replyMessage && replyMessage.text) {
        const newDescription = replyMessage.text;
        const success = await updateEventDescription(eventId, newDescription);

        if (success) {
          await ctx.reply(
            `✅ Descrição do evento "${event.summary}" atualizada com sucesso!\n\n📝 Nova descrição: ${newDescription}`
          );
        } else {
          await ctx.reply("❌ Erro ao atualizar a descrição do evento.");
        }
        return;
      }

      // Se a mensagem respondida tem imagem, faz upload
      const photo = "photo" in replyMessage ? replyMessage.photo : undefined;
      const document =
        "document" in replyMessage ? replyMessage.document : undefined;

      if (!photo && !document) {
        await ctx.reply(
          "A mensagem respondida deve conter texto (para nova descrição) ou imagem (para ilustrar o evento)."
        );
        return;
      }

      // Determina qual arquivo usar (prioriza document sobre photo)
      const fileToUpload = document || (photo ? photo[photo.length - 1] : null);

      if (!fileToUpload) {
        await ctx.reply("Não foi possível obter o arquivo.");
        return;
      }

      // Obtém o arquivo do Telegram
      const file = await ctx.telegram.getFile(fileToUpload.file_id);

      if (!file.file_path) {
        await ctx.reply("Não foi possível obter o arquivo.");
        return;
      }

      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const fileBuffer = (await response.arrayBuffer()) as Buffer;

      // Determina a pasta baseada no workgroup do evento
      const workgroupId = event.extendedProperties?.private?.workgroup;
      let folderId = "1mahWKZYr9kRgodUU-uO_TAcYBM2MgYbJ"; // Pasta padrão (Tecnologia)

      if (workgroupId) {
        const workgroups = require("../credentials/workgroupsfolders.json");
        const workgroup = workgroups.find(
          (g: any) => g.value.toString() === workgroupId
        );
        if (workgroup) {
          folderId = workgroup.folderId;
        }
      }

      // Prepara o nome do arquivo
      const date = formatDate(new Date());
      const eventTitle = sanitizeFileName(event.summary || "Evento");
      const fileName = `${date} - ${eventTitle} - Complemento`;

      const uploadResponse = await uploadInvoice(
        fileBuffer,
        fileName,
        folderId
      );

      if (!uploadResponse) {
        await ctx.reply("Erro ao fazer upload da imagem.");
        return;
      }

      // Adiciona a imagem como anexo do evento
      const success = await addEventAttachment(
        eventId,
        uploadResponse,
        fileName
      );

      if (success) {
        await ctx.reply(
          `✅ Imagem do evento "${event.summary}" anexada com sucesso!\n\n📁 Arquivo: ${fileName}\n📎 Anexo adicionado ao evento`
        );
      } else {
        await ctx.reply(
          `✅ Imagem arquivada, mas houve erro ao anexar ao evento.\n\n📁 Arquivo: ${fileName}\n🔗 Link: ${uploadResponse}`
        );
      }
    } catch (error) {
      console.error("Erro ao complementar evento:", error);
      await ctx.reply(
        "Ocorreu um erro ao processar o complemento do evento. Tente novamente."
      );
    }
  });
}

export const complementarEventoCommand = {
  register: registerComplementarEventoCommand,
  name: () => "/complementar_evento",
  help: () =>
    "Use o comando `/complementar_evento [id do evento]` como resposta a uma mensagem com texto (nova descrição) ou imagem (para ilustrar o evento).",
  description: () => "📝 Complementa um evento com nova descrição ou imagem.",
};
