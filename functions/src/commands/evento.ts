import { Context, Telegraf } from "telegraf";
import { sendChatCompletion } from "../services/groq";
import { getEventById, addEventAttachment, uploadFile, updateEventWorkgroup } from "../services/google";
import { formatDate } from "../utils/utils";
import { buildEventButtons, buildEventMessage, buildDailyAgendaMessage } from "../utils/eventMessages";
import workgroups from "../credentials/workgroupsfolders.json";
import calendars from "../credentials/calendars.json";
import { formatExtraParticipantsSummary, registerExtraParticipants } from "../services/eventParticipants";


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

function sanitizeFileName(text: string, maxLength = 80): string {
  const sanitized = text
    .replace(/[\\/:*?\"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();

  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

function parseEventoCommandText(text: string): {
  eventId: string | null;
  manualParticipantsPayload: string;
} {
  const textWithoutCommand = text.replace(/\/evento(@\w+)?/i, "").trim();
  if (!textWithoutCommand) {
    return {
      eventId: null,
      manualParticipantsPayload: "",
    };
  }

  const firstWhitespaceIndex = textWithoutCommand.search(/\s/);
  if (firstWhitespaceIndex === -1) {
    return {
      eventId: textWithoutCommand,
      manualParticipantsPayload: "",
    };
  }

  const eventId = textWithoutCommand.slice(0, firstWhitespaceIndex).trim();
  const rawRest = textWithoutCommand.slice(firstWhitespaceIndex).trim();

  if (!rawRest) {
    return {
      eventId,
      manualParticipantsPayload: "",
    };
  }

  if (rawRest.toLowerCase().startsWith("presentes ")) {
    return {
      eventId,
      manualParticipantsPayload: rawRest.slice("presentes".length).trim(),
    };
  }

  if (rawRest === "@") {
    return {
      eventId,
      manualParticipantsPayload: "",
    };
  }

  if (rawRest.startsWith("@ ")) {
    return {
      eventId,
      manualParticipantsPayload: rawRest.slice(1).trim(),
    };
  }

  return {
    eventId,
    manualParticipantsPayload: rawRest,
  };
}

function registerEventoCommand(bot: Telegraf) {
  bot.command("evento", async (ctx: Context) => {
    try {
      console.log("[evento] Iniciando comando /evento");
      
      // Verifica se tem ID após o comando
      const text = ctx.text || "";
      const { eventId, manualParticipantsPayload } = parseEventoCommandText(text);
      
      // Se tem ID, é para complementar evento
      if (eventId) {
        console.log("[evento] Modo complementar evento com ID:", eventId);

        if (manualParticipantsPayload) {
          const result = await registerExtraParticipants(
            eventId,
            manualParticipantsPayload,
            ctx.from!
          );
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
              console.error("[evento] Erro ao atualizar mensagem do evento:", error);
            }
          }

          await ctx.reply(summary || "Nenhum participante novo foi adicionado.");
          return;
        }
        
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
          // Nova funcionalidade: transferir evento para o grupo atual
          const chatId = ctx.chat?.id;
          const isValidGroup = chatId && ALLOWED_GROUPS.includes(Number(chatId));
          
          if (isValidGroup) {
            console.log("[evento] Transferindo evento para grupo atual:", chatId);
            
            // Encontra o grupo atual
            const currentGroup = workgroups.find(g => Number(g.value) === Number(chatId));
            if (!currentGroup) {
              await ctx.reply("❌ Grupo não encontrado na configuração.");
              return;
            }
            
            // Verifica se já está atribuído ao grupo atual
            const currentWorkgroup = event.extendedProperties?.private?.workgroup;
            if (currentWorkgroup === chatId?.toString()) {
              await ctx.reply(`⚠️ Este evento já pertence ao grupo **${currentGroup.label}**.\n\n💡 Para complementar o evento com texto ou imagem, responda a uma mensagem contendo o conteúdo desejado.`, {
                parse_mode: "Markdown"
              });
              return;
            }
            
            // Atualiza o workgroup do evento
            const success = await updateEventWorkgroup(eventId, chatId.toString());
            
            if (success) {
              const eventTitle = event.summary || "Evento sem título";
              
              // Publica o evento no grupo atual
              const eventMessage = buildDailyAgendaMessage([event]);
              await ctx.reply(eventMessage, {
                parse_mode: "MarkdownV2",
                link_preview_options: { is_disabled: true }
              });
              
              // Confirma a transferência
              const previousGroup = currentWorkgroup ? 
                workgroups.find(g => g.value.toString() === currentWorkgroup)?.label || "Grupo anterior" :
                "Nenhum grupo";
              
              await ctx.reply(
                `✅ **Evento transferido com sucesso!**\n\n` +
                `📝 **Evento:** ${eventTitle}\n` +
                `📤 **De:** ${previousGroup}\n` +
                `📥 **Para:** ${currentGroup.label}`,
                { parse_mode: "Markdown" }
              );
            } else {
              await ctx.reply("❌ Erro ao transferir o evento. Tente novamente.");
            }
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
        const eventTitle = sanitizeFileName(event.summary || "Evento", 60);
        
        // Detecta extensão e mime type do arquivo
        let extension = ".jpg";
        let mimeType = "image/jpeg";
        
        if (document?.mime_type) {
          if (document.mime_type.includes("png")) {
            extension = ".png";
            mimeType = "image/png";
          } else if (document.mime_type.includes("pdf")) {
            extension = ".pdf";
            mimeType = "application/pdf";
          } else if (document.mime_type.includes("jpeg")) {
            extension = ".jpg";
            mimeType = "image/jpeg";
          }
        } else if (photo) {
          extension = ".png";
          mimeType = "image/png";
        }
        
        const fileName = `${date} - ${eventTitle}${extension}`;

        const uploadResponse = await uploadFile(
          fileBuffer,
          fileName,
          folderId,
          mimeType
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
      } else if (msg?.reply_to_message?.caption) {
        messageText = msg.reply_to_message.caption;
        console.log("[evento] Texto obtido da legenda da imagem respondida.");
      } else if (msg?.text) {
        const textAfterCommand = msg.text.replace(/\/evento(@\w+)?/, "").trim();
        messageText = textAfterCommand;
        console.log("[evento] Texto obtido da própria mensagem.");
      } else if (msg?.caption) {
        messageText = msg.caption.replace("/evento", "").replace(/@\w+/, "").trim();
        console.log("[evento] Texto obtido da legenda da imagem.");
      }
      if (!messageText || messageText.length === 0) {
        console.log("[evento] Texto do evento não fornecido.");
        await ctx.reply(
          "Por favor, forneça o texto descritivo do evento (ou responda a uma mensagem/imagem com esse texto)."
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
      
      console.log("[evento] Resposta bruta do Azure:", rawContent);

      let eventObject;
      let cleanedContent = "";
      try {
        // Remove quebras de linha e limpa o conteúdo
        cleanedContent = rawContent.replace(/\n/g, "").trim();
        
        // Remove possíveis marcadores de código markdown
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        
        console.log("[evento] Conteúdo limpo:", cleanedContent);
        
        // Tenta encontrar um JSON válido no conteúdo
        const jsonMatch = cleanedContent.match(/\{.*\}/);
        if (jsonMatch) {
          cleanedContent = jsonMatch[0];
        }
        
        // Se o JSON estiver truncado, tenta completá-lo
        if (!cleanedContent.endsWith('}')) {
          console.log("[evento] JSON parece truncado, tentando corrigir...");
          
          // Verifica se a última propriedade (description) está incompleta
          const lastQuoteIndex = cleanedContent.lastIndexOf('"');
          const afterLastQuote = cleanedContent.substring(lastQuoteIndex + 1);
          
          // Se não termina com aspas e tem conteúdo após a última aspa, fecha a string
          if (!cleanedContent.endsWith('"') && afterLastQuote.trim() && !afterLastQuote.includes('"')) {
            console.log("[evento] Fechando string description truncada");
            cleanedContent += '"';
          }
          
          // Remove vírgula no final se existir
          cleanedContent = cleanedContent.replace(/,\s*$/, '');
          
          // Conta as chaves abertas e fechadas
          const openBraces = (cleanedContent.match(/\{/g) || []).length;
          const closeBraces = (cleanedContent.match(/\}/g) || []).length;
          
          console.log(`[evento] Chaves abertas: ${openBraces}, fechadas: ${closeBraces}`);
          
          // Adiciona chaves fechadas se necessário
          for (let i = 0; i < openBraces - closeBraces; i++) {
            cleanedContent += '}';
          }
          
          console.log("[evento] JSON corrigido:", cleanedContent.substring(cleanedContent.length - 100));
        }
        
        console.log("[evento] Tentando fazer parse do JSON...");
        eventObject = JSON.parse(cleanedContent);
        console.log("[evento] Parse bem-sucedido!");
      } catch (parseErr) {
        console.error("[evento] Erro ao fazer parse do JSON:", parseErr);
        console.error("[evento] Conteúdo original:", rawContent);
        console.error("[evento] Conteúdo limpo:", cleanedContent);
        await ctx.reply(`Erro ao processar resposta da IA. Conteúdo recebido: ${rawContent.substring(0, 200)}...`);
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

Comando unificado para criar, complementar e transferir eventos.

*Usos:*
\`/evento\` - Criar novo evento
\`/evento <ID>\` - Complementar ou transferir evento existente
\`/evento <ID> presentes <lista>\` - Registrar participantes extras

*Funcionalidades:*
• **Criar evento:** Responda a um texto descritivo ou digite após o comando
• **Complementar com texto:** \`/evento <ID>\` respondendo a um texto
• **Complementar com imagem:** \`/evento <ID>\` respondendo a uma imagem
• **Transferir para grupo:** \`/evento <ID>\` sem resposta (puxa evento para o grupo atual)
• **Registrar participantes:** \`/evento <ID> presentes Ana, João\`
• **Registrar participantes com @:** \`/evento <ID> @dvalenca, Ana\`
• **Registrar participantes direto:** \`/evento <ID> Ana, João\`

*Exemplos:*
\`/evento\` (respondendo a "Reunião amanhã às 14h")
\`/evento abc123\` (respondendo a nova descrição)
\`/evento abc123\` (respondendo a imagem)
\`/evento abc123\` (transfere evento para este grupo)
\`/evento abc123 presentes Ana, João\`
\`/evento abc123 @dvalenca, Barbara\`
\`/evento abc123 Ana, Barbara, Cássio\`
  `,
  description: () => "📅 Criar, complementar e transferir eventos.",
};
