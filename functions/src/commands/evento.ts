import { Context, Telegraf } from "telegraf";
import { sendChatCompletion } from "../services/azure";
import workgroups from "../credentials/workgroupsfolders.json";
import calendars from "../credentials/calendars.json";


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
      } else if (msg?.reply_to_message?.caption) {
        messageText = msg.reply_to_message.caption;
        console.log("[evento] Texto obtido da legenda da imagem respondida.");
      } else if (msg?.text) {
        messageText = msg.text.replace("/evento", "").replace(/@\w+/, "").trim();
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

      // Ajusta a data atual para o fuso horário GMT‑3 (acrescentando 3 horas)
      const nowLocal = new Date(new Date().getTime() + 3 * 60 * 60 * 1000);
      console.log(
        "[evento] Data atual ajustada para GMT-3:",
        nowLocal.toISOString()
      );
      const prompt = `Hoje é dia ${nowLocal.toISOString()} e quero que extraia as informações de evento do seguinte texto. O texto pode ser de uma legenda de imagem ou cabeçalho, então seja flexível na interpretação. Retorne APENAS um JSON no formato:
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

      // Ajusta as datas para GMT‑3, somando 3 horas
      if (eventObject.startDate) {
        const start = new Date(eventObject.startDate);
        start.setHours(start.getHours() + 3);
        eventObject.startDate = start.toISOString();
        console.log("[evento] startDate ajustada:", eventObject.startDate);
      }
      if (eventObject.endDate) {
        const end = new Date(eventObject.endDate);
        end.setHours(end.getHours() + 3);
        eventObject.endDate = end.toISOString();
        console.log("[evento] endDate ajustada:", eventObject.endDate);
      }

      eventObject.from = ctx.from;
      eventObject.workgroup = ctx.chat.id;
      console.log(
        "[evento] JSON final do evento:",
        JSON.stringify(eventObject)
      );

      // Formata o evento de forma amigável
      const formatEventDetails = (event: any) => {
        const { escapeMarkdownV2 } = require('../utils/utils');
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        
        const formatDate = (date: Date) => {
          return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        };
        
        return `📅 **${escapeMarkdownV2(event.name)}**\n\n` +
               `🗓️ **Início:** ${escapeMarkdownV2(formatDate(startDate))}\n` +
               `🏁 **Fim:** ${escapeMarkdownV2(formatDate(endDate))}\n` +
               `📍 **Local:** ${escapeMarkdownV2(event.location || 'Não informado')}\n` +
               `📝 **Descrição:** ${escapeMarkdownV2(event.description || 'Não informada')}`;
      };
      
      const eventMessage = formatEventDetails(eventObject);
      console.log("[evento] Mensagem de evento construída.");

      // Gera um ID temporário para o evento
      const tempEventId = Math.random().toString(36).substring(2, 8);
      
      // Armazena temporariamente os dados do evento no Firebase
      const { admin } = require('../config/firebaseInit');
      console.log(`[evento] Salvando evento temporário com ID: ${tempEventId}`);
      await admin.database().ref(`temp_events/${tempEventId}`).set(eventObject);
      console.log("[evento] Evento temporário salvo no Firebase");

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
  help: () =>
    "Use o comando `/evento` em resposta a uma mensagem de texto ou imagem com legenda, ou digitando `/evento [texto descritivo]` para gerar um evento formatado.",
  description: () => "📅 Criar evento a partir de descrição.",
};
