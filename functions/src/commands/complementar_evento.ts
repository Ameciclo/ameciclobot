import { Context, Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { getEventById, addEventAttachment } from "../services/google";
import { uploadInvoice } from "../services/google";
import { formatDate, escapeMarkdownV2 } from "../utils/utils";
import calendars from "../credentials/calendars.json";
import workgroups from "../credentials/workgroupsfolders.json";

function sanitizeFileName(text: string, maxLength = 50): string {
  const sanitized = text
    .replace(/[\\/:*?\"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();

  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

async function updateEventDescription(eventId: string, newDescription: string): Promise<boolean> {
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
      console.log("[complementar_evento] Comando /complementar_evento executado");
      console.log("[complementar_evento] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
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

      // Se não há resposta a uma mensagem
      if (
        !ctx.message ||
        !("reply_to_message" in ctx.message) ||
        !ctx.message.reply_to_message
      ) {
        // Verifica se está no grupo da secretaria E tem apenas uma palavra (ID)
        const isSecretariaGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
        const args = text.split(" ").slice(1); // Remove o comando, pega só os argumentos
        
        if (isSecretariaGroup && args.length === 1) {
          // Verifica se já está atribuído
          const currentWorkgroup = event.extendedProperties?.private?.workgroup;
          if (currentWorkgroup) {
            const group = workgroups.find(g => g.value.toString() === currentWorkgroup);
            const groupName = group ? group.label : "Grupo desconhecido";
            await ctx.reply(`⚠️ Este evento já está atribuído ao grupo: **${groupName}**\n\n💡 Para complementar o evento com texto ou imagem, responda a uma mensagem contendo o conteúdo desejado.`, {
              parse_mode: "Markdown"
            });
            return;
          }

          // Criar teclado com grupos de trabalho + opção cancelar
          const buttons = workgroups.map(group => {
            const callbackData = `asg|${group.value}|${eventId}`;
            return Markup.button.callback(
              `📋 ${group.label}`,
              callbackData
            );
          });
          
          // Adiciona botão de cancelar
          buttons.push(Markup.button.callback("❌ Cancelar", `cancel|${eventId}`));
          
          const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

          const eventTitle = event.summary || "Evento sem título";
          const message = `🎯 **Atribuindo evento a um grupo de trabalho**\n\n📝 **Evento:** ${escapeMarkdownV2(eventTitle)}\n\n👥 Selecione o grupo de trabalho:\n\n💡 **Outras funções disponíveis:**\n• Responda a um texto para alterar a descrição\n• Responda a uma imagem para anexar ao evento`;

          await ctx.reply(message, {
            parse_mode: "MarkdownV2",
            reply_markup: keyboard.reply_markup
          });
          return;
        } else {
          await ctx.reply(
            "Este comando deve ser usado como resposta a uma mensagem com texto (nova descrição) ou imagem (para ilustrar o evento).\n\n💡 **Funções disponíveis:**\n• Responda a um texto para alterar a descrição\n• Responda a uma imagem para anexar ao evento"
          );
          return;
        }
      }

      const replyMessage = ctx.message.reply_to_message;

      // Se a mensagem respondida tem texto, atualiza a descrição
      if ("text" in replyMessage && replyMessage.text) {
        const newDescription = replyMessage.text;
        const success = await updateEventDescription(eventId, newDescription);
        
        if (success) {
          console.log(`[complementar_evento] Descrição atualizada para evento: "${event.summary}"`);
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
      const document = "document" in replyMessage ? replyMessage.document : undefined;

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
        const workgroup = workgroups.find((g: any) => g.value.toString() === workgroupId);
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
      const success = await addEventAttachment(eventId, uploadResponse, fileName);

      if (success) {
        console.log(`[complementar_evento] Imagem anexada ao evento: "${event.summary}" - Arquivo: ${fileName}`);
        await ctx.reply(
          `✅ Imagem do evento "${event.summary}" anexada com sucesso!\n\n📁 Arquivo: ${fileName}\n📎 Anexo adicionado ao evento`
        );
      } else {
        await ctx.reply(
          `✅ Imagem arquivada, mas houve erro ao anexar ao evento.\n\n📁 Arquivo: ${fileName}\n🔗 Link: ${uploadResponse}`
        );
      }

    } catch (error) {
      console.error("[complementar_evento] Erro ao complementar evento:", error);
      await ctx.reply(
        "Ocorreu um erro ao processar o complemento do evento. Tente novamente."
      );
    }
  });
}

export const complementarEventoCommand = {
  register: registerComplementarEventoCommand,
  name: () => "/complementar_evento",
  help: () => `
📝 *Complementar Evento*

Complementa um evento com nova descrição, imagem ou atribui a um grupo de trabalho.

*Uso:*
\`/complementar_evento <ID_DO_EVENTO>\`

*Funcionalidades:*
• **Responda a um texto:** Altera a descrição do evento
• **Responda a uma imagem:** Anexa a imagem ao evento
• **Sem resposta (no grupo da secretaria):** Oferece opções para atribuir a grupos de trabalho

*Exemplo:*
\`/complementar_evento abc123def456\`

O ID do evento pode ser encontrado nas mensagens de agenda enviadas pela Secretaria.
  `,
  description: () => "📝 Complementa um evento com descrição, imagem ou atribui a grupo de trabalho.",
};