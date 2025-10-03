import { Context, Telegraf } from "telegraf";
import { sendChatCompletion } from "../services/azure";
import workgroups from "../credentials/workgroupsfolders.json";

const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

function registerResumoCommand(bot: Telegraf) {
  bot.command("resumo", async (ctx: Context) => {
    try {
      console.log("[resumo] Iniciando comando /resumo");
      const chatId = ctx.chat?.id;
      if (!chatId || !ALLOWED_GROUPS.includes(Number(chatId))) {
        console.log("[resumo] Chat não autorizado.");
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
        console.log("[resumo] Texto obtido da mensagem respondida.");
      } else if (msg?.reply_to_message?.caption) {
        messageText = msg.reply_to_message.caption;
        console.log("[resumo] Texto obtido da legenda da imagem respondida.");
      } else if (msg?.text) {
        messageText = msg.text.replace("/resumo", "").trim();
        console.log("[resumo] Texto obtido da própria mensagem.");
      } else if (msg?.caption) {
        messageText = msg.caption.replace("/resumo", "").trim();
        console.log("[resumo] Texto obtido da legenda da imagem.");
      }

      if (!messageText) {
        console.log("[resumo] Texto não fornecido.");
        await ctx.reply(
          "Por favor, forneça o texto para resumir (ou responda a uma mensagem/imagem com esse texto)."
        );
        return;
      }

      // Detecta o tipo de conteúdo para ajustar as instruções
      const detectContentType = (text: string): string => {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes("reunião") || lowerText.includes("ata") || 
            lowerText.includes("pauta") || lowerText.includes("deliberação")) {
          return "reunião";
        }
        
        if (lowerText.includes("evento") || lowerText.includes("atividade") || 
            lowerText.includes("encontro") || lowerText.includes("workshop")) {
          return "evento";
        }
        
        return "geral";
      };

      const contentType = detectContentType(messageText);
      console.log("[resumo] Tipo de conteúdo detectado:", contentType);

      // Define instruções específicas baseadas no tipo de conteúdo
      const getInstructions = (type: string): string => {
        switch (type) {
          case "reunião":
            return "Resuma esta reunião destacando os principais pontos discutidos e decisões tomadas. Mantenha o tom formal e objetivo.";
          case "evento":
            return "Resuma este evento para divulgação no boletim informativo da Ameciclo. Use linguagem atrativa e destaque informações importantes como data, local e atividades.";
          default:
            return "Resuma este texto de forma clara e objetiva, mantendo as informações mais importantes.";
        }
      };

      const instructions = getInstructions(contentType);
      const prompt = `${instructions} O resumo deve ter no máximo 300 caracteres.

Texto para resumir:
"${messageText}"`;

      console.log("[resumo] Enviando prompt para sendChatCompletion...");
      const azureResponse = await sendChatCompletion([
        {
          role: "system",
          content: "Você é um assistente da Ameciclo que cria resumos concisos e informativos. Sempre respeite o limite de caracteres solicitado."
        },
        { role: "user", content: prompt }
      ]);

      const resumo = azureResponse.choices?.[0]?.message?.content;
      if (!resumo) {
        console.log("[resumo] Azure não retornou conteúdo.");
        await ctx.reply("Não foi possível gerar o resumo. Tente novamente.");
        return;
      }

      // Verifica se o resumo excede 300 caracteres
      const finalResumo = resumo.length > 300 ? resumo.substring(0, 297) + "..." : resumo;
      
      const responseMessage = `📝 **Resumo gerado:**\n\n${finalResumo}\n\n_Caracteres: ${finalResumo.length}/300_`;

      await ctx.reply(responseMessage, { parse_mode: "Markdown" });
      console.log("[resumo] Comando /resumo concluído com sucesso.");
      
    } catch (err) {
      console.error("[resumo] Erro no comando /resumo:", err);
      await ctx.reply("Ocorreu um erro ao gerar o resumo.");
    }
  });
}

export const resumoCommand = {
  register: registerResumoCommand,
  name: () => "/resumo",
  help: () => "Use o comando `/resumo` em resposta a uma mensagem de texto ou digitando `/resumo [texto]` para gerar um resumo de até 300 caracteres.",
  description: () => "📝 Resumir texto usando IA."
};