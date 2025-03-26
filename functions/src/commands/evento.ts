// src/commands/evento.ts
import { Context, Telegraf } from "telegraf";
import fetch from "node-fetch";
import azureConfig from "../credentials/azureConfig.json";
import workgroups from "../credentials/workgroupsfolders.json";

// Transforma a lista de workgroups em um array de IDs (números ou strings)
const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

async function sendTextToAzureGPT(text: string): Promise<any> {
  const prompt = `Extraia as informações de evento do seguinte texto e retorne APENAS um JSON no formato:
{
  "name": "Título do Evento",
  "startDate": "ISODate",
  "endDate": "ISODate",
  "location": "Local do evento",
  "description": "Descrição completa do evento"
}

Texto:
"${text}"`;

  const response = await fetch(
    `${azureConfig.endpoint}${azureConfig.deployment}/chat/completions?api-version=${azureConfig.apiVersion}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureConfig.apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente que extrai informações de eventos e retorna APENAS um JSON estruturado.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1,
        model: azureConfig.deployment,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao chamar Azure GPT: ${response.statusText}`);
  }
  return await response.json();
}

export function registerEventoCommand(bot: Telegraf) {
  bot.command("evento", async (ctx: Context) => {
    try {
      const chatId = ctx.chat?.id;

      // Se não tiver chatId ou não estiver nos grupos permitidos, sai
      if (!chatId || !ALLOWED_GROUPS.includes(Number(chatId))) {
        await ctx.reply(
          "Este comando só pode ser usado nos grupos de trabalho da Ameciclo."
        );
        return;
      }

      // Tenta pegar o texto da mensagem respondida
      let messageText: string | undefined;

      // Aserta que ctx.message é do tipo 'any', pois a definição TS do Telegraf
      // pode não conter 'reply_to_message' em alguns subtipos.
      const msg = ctx.message as any;

      if (msg?.reply_to_message?.text) {
        // Se for uma resposta a uma mensagem de texto
        messageText = msg.reply_to_message.text;
      } else if (msg?.text) {
        // Caso contrário, pega o texto digitado após /evento
        messageText = msg.text.replace("/evento", "").trim();
      }

      if (!messageText) {
        await ctx.reply(
          "Por favor, forneça o texto descritivo do evento (ou responda a uma mensagem com esse texto)."
        );
        return;
      }

      const azureResponse = await sendTextToAzureGPT(messageText);
      const rawContent = azureResponse.choices?.[0]?.message?.content;
      if (!rawContent) {
        await ctx.reply(
          "Não foi possível obter a resposta formatada. Tente novamente."
        );
        return;
      }

      // Tenta fazer o parse do JSON contido em rawContent
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
