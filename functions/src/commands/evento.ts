import { Context, Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { sendChatCompletion } from "../services/azure";
import { getEventById, addEventAttachment, uploadInvoice } from "../services/google";
import { formatDate, escapeMarkdownV2 } from "../utils/utils";
import workgroups from "../credentials/workgroupsfolders.json";
import calendars from "../credentials/calendars.json";
import { buildEventMessage } from "../messages/eventMessages";

// Converte a lista de workgroups para um array de IDs numéricos
const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

async function updateEventDescription(eventId: string, newDescription: string): Promise<boolean> {
  const { google } = require("googleapis");
  const { getJwt } = require("../services/google");
  
  const auth = getJwt();
  const calendar = google.calendar({ version: "v3", auth });
  
  const event = await getEventById(eventId);
  if (!event) {
    console.error(`Evento ${eventId} não encontrado para atualizar descrição`);
    return false;
  }
  
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

function sanitizeFileName(text: string, maxLength = 50): string {
  const sanitized = text
    .replace(/[\\/:*?\"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();

  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

function registerEventoCommand(bot: Telegraf) {
  bot.command("evento", async (ctx: Context) => {
    try {
      console.log("[evento] Iniciando comando /evento");
      
      // Verifica se tem ID após o comando
      const text = ctx.text || "";
      const args = text.split(" ").slice(1);
      const eventId = args.length === 1 ? args[0] : null;
      
      // Se tem ID, é para complementar evento
      if (eventId) {
        console.log("[evento] Modo complementar evento com ID:", eventId);
        
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
          // Verifica se está no grupo da secretaria
          const isSecretariaGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
          
          if (isSecretariaGroup) {
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
        
        // Tem resposta a mensagem - processar complemento
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
        const document = "document" in replyMessage ? replyMessage.document : undefined;

        if (!photo && !document) {
          await ctx.reply(
            "A mensagem respondida deve conter texto (para nova descrição) ou imagem (para ilustrar o evento)."
          );
          return;
        }

        const fileToUpload = document || (photo ? photo[photo.length - 1] : null);
        
        if (!fileToUpload) {
          await ctx.reply("Não foi possível obter o arquivo.");
          return;
        }

        const file = await ctx.telegram.getFile(fileToUpload.file_id);

        if (!file.file_path) {
          await ctx.reply("Não foi possível obter o arquivo.");
          return;
        }

        const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const fileBuffer = (await response.arrayBuffer()) as Buffer;

        const workgroupId = event.extendedProperties?.private?.workgroup;
        let folderId = "1mahWKZYr9kRgodUU-uO_TAcYBM2MgYbJ";
        
        if (workgroupId) {
          const workgroup = workgroups.find((g: any) => g.value.toString() === workgroupId);
          if (workgroup) {
            folderId = workgroup.folderId;
          }
        }

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

        const success = await addEventAttachment(eventId, uploadResponse, fileName);

        if (success) {
          await ctx.reply(
            `✅ Imagem do evento "${event.summary}" anexada com sucesso!\n\n📁 Arquivo: ${fileName}\n📎 Anexo adicionado ao evento`
          );
        } else {
          await ctx.reply(
            `✅ Imagem arquivada, mas houve erro ao anexar ao evento.\n\n📁 Arquivo: ${fileName}\n🔗 Link: ${uploadResponse}`
          );
        }
        return;
      }
      
      // Sem ID - modo criar evento
      console.log("[evento] Modo criar evento");
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
        const textAfterCommand = msg.text.replace(/\/evento(@\w+)?/, "").trim();
        messageText = textAfterCommand;
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
      const nowUTC = new Date();
      const nowLocal = new Date(nowUTC.getTime() - (3 * 60 * 60 * 1000));
      console.log("[evento] Data atual (GMT-3):", nowLocal.toISOString());
      const prompt = `Hoje é dia ${nowLocal.toISOString()} (GMT-3, horário de Brasília) e quero que extraia as informações de evento do seguinte texto e retorne APENAS um JSON no formato:
{
  "name": "Título do Evento",
  "startDate": "ISODate no formato GMT-3 (ex: 2025-10-28T17:00:00-03:00)",
  "endDate": "ISODate no formato GMT-3 (ex: 2025-10-28T19:00:00-03:00)",
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

      // Gera um ID temporário para o evento
      const tempEventId = Math.random().toString(36).substring(2, 15);
      
      // Salva temporariamente no Firebase
      const { admin } = require("../config/firebaseInit");
      await admin.database().ref(`temp_events/${tempEventId}`).set(eventObject);
      console.log("[evento] Evento salvo temporariamente com ID:", tempEventId);

      const eventMessage = buildEventMessage(eventObject);
      console.log("[evento] Mensagem de evento construída.");

      const inlineKeyboard = {
        reply_markup: {
          inline_keyboard: [
            ...calendars.map((calendar: any, index: number) => [
              {
                text: `➕ ${calendar.name}`,
                callback_data: `add_event_${index}_${tempEventId}`,
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
  help: () => `
📅 *Comando Evento*

Comando unificado para criar, complementar e atribuir eventos.

*Usos:*
\`/evento\` - Criar novo evento
\`/evento <ID>\` - Complementar ou atribuir evento existente

*Funcionalidades:*
• **Criar evento:** Responda a um texto descritivo ou digite após o comando
• **Complementar com texto:** \`/evento <ID>\` respondendo a um texto
• **Complementar com imagem:** \`/evento <ID>\` respondendo a uma imagem
• **Atribuir a grupo:** \`/evento <ID>\` sem resposta (apenas em grupos)

*Exemplos:*
\`/evento\` (respondendo a "Reunião amanhã às 14h")
\`/evento abc123\` (respondendo a nova descrição)
\`/evento abc123\` (respondendo a imagem)
\`/evento abc123\` (sem resposta, para atribuir)
  `,
  description: () => "📅 Criar, complementar e atribuir eventos.",
};
