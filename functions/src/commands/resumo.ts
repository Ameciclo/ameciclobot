import { Context, Telegraf } from "telegraf";
import { sendChatCompletion } from "../services/groq";
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

      // Obtém o texto da mensagem (APENAS de reply)
      let messageText: string | undefined;
      const msg = ctx.message as any;
      if (msg?.reply_to_message?.text) {
        messageText = msg.reply_to_message.text;
        console.log("[resumo] Texto obtido da mensagem respondida.");
      } else if (msg?.reply_to_message?.caption) {
        messageText = msg.reply_to_message.caption;
        console.log("[resumo] Texto obtido da legenda da imagem respondida.");
      }

      // Extrai limite de caracteres do comando
      const text = ctx.text || "";
      const args = text.split(" ").slice(1);
      const customLimit = args.length > 0 && !isNaN(Number(args[0])) ? Number(args[0]) : 300;

      if (!messageText) {
        console.log("[resumo] Comando usado sem resposta a mensagem.");
        await ctx.reply(
          "📝 *Como usar o /resumo:*\n\n1️⃣ Responda a uma mensagem com texto\n2️⃣ Digite `/resumo` ou `/resumo [número]`\n\n*Exemplos:*\n• `/resumo` - 300 caracteres\n• `/resumo 150` - 150 caracteres\n\n✨ *Resultado:* Resumo + 3 hashtags",
          { parse_mode: "Markdown" }
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
      const prompt = `${instructions} O resumo deve ter no máximo ${customLimit} caracteres. Além do resumo, gere também 3 palavras-chave relevantes no formato #palavra_chave (use underscore para palavras compostas).

Texto para resumir:
"${messageText}"`;

      console.log("[resumo] Enviando prompt para sendChatCompletion...");
      const groqResponse = await sendChatCompletion([
        {
          role: "system",
          content: "Você é um assistente da Ameciclo que cria resumos concisos e informativos. Sempre respeite o limite de caracteres solicitado. Retorne o resumo seguido das 3 palavras-chave em linhas separadas."
        },
        { role: "user", content: prompt }
      ]);

      const response = groqResponse.choices?.[0]?.message?.content;
      if (!response) {
        console.log("[resumo] Groq não retornou conteúdo.");
        await ctx.reply("Não foi possível gerar o resumo. Tente novamente.");
        return;
      }

      // Separa resumo e palavras-chave
      const lines = response.split('\n').filter(line => line.trim());
      const resumoText = lines.find(line => !line.startsWith('#')) || lines[0];
      const keywords = lines.filter(line => line.startsWith('#')).join(' ');
      
      // Verifica se o resumo excede o limite
      const finalResumo = resumoText.length > customLimit ? resumoText.substring(0, customLimit - 3) + "..." : resumoText;
      
      const responseMessage = `📝 *Resumo gerado:*\n\n${finalResumo}\n\n${keywords}\n\n_Caracteres: ${finalResumo.length}/${customLimit}_`;

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
  help: () => "Use `/resumo` ou `/resumo [número]` em resposta a uma mensagem para gerar resumo com palavras-chave. Exemplo: `/resumo 150` para 150 caracteres.",
  description: () => "📝 Resumir texto usando IA."
};