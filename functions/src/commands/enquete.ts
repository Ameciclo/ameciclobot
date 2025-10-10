// src/commands/enquete.ts
import { Context, Telegraf } from "telegraf";

function registerEnqueteCommand(bot: Telegraf) {
  bot.command("enquete", async (ctx: Context) => {
    try {
      console.log("[enquete] Comando /enquete executado");
      console.log("[enquete] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      if (!from || !chat) {
        await ctx.reply(
          "❌ Não foi possível identificar as informações da mensagem."
        );
        return;
      }

      // Extrair o texto da enquete
      const msg = ctx.message as any;

      const enqueteText = msg?.text
        ?.replace("/enquete@ameciclobot", "")
        .replace("/enquete", "")
        .trim();

      if (!enqueteText) {
        await ctx.reply(
          "📊 *Como usar o comando /enquete*\n\n" +
            "Use o comando `/enquete [pergunta]` para criar uma enquete de votação.\n\n" +
            "*Exemplo:*\n" +
            "`/enquete Vamos aprovar a proposta de ciclovias na Rua da Aurora?`\n\n" +
            "A enquete será criada automaticamente com as opções:\n" +
            "• ✅ Aprovado\n" +
            "• ❌ Reprovado\n" +
            "• 🤷 Abstenção\n" +
            "• 👁️ Vistas\n\n" +
            "Os votos serão públicos e cada pessoa pode votar apenas uma vez.",
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Criar a enquete com as opções padrão
      const options = [
        "✅ Aprovado",
        "❌ Reprovado",
        "🤷 Abstenção",
        "👁️ Vistas",
      ];

      await ctx.sendPoll(enqueteText, options, {
        is_anonymous: false, // Votos públicos
        allows_multiple_answers: false, // Apenas uma opção por pessoa
      });

      console.log(
        `[enquete] Enquete criada por ${from.first_name}: "${enqueteText}"`
      );
      console.log("[enquete] Comando /enquete concluído com sucesso");
    } catch (error) {
      console.error("[enquete] Erro no comando:", error);
      await ctx.reply(
        "❌ Ocorreu um erro ao criar a enquete. Tente novamente mais tarde."
      );
    }
  });
}

export const enqueteCommand = {
  register: registerEnqueteCommand,
  name: () => "/enquete",
  help: () =>
    "Use o comando `/enquete [pergunta]` para criar uma enquete de votação\\. " +
    "A enquete será criada automaticamente com as opções: Aprovado, Reprovado, Abstenção e Vistas\\. " +
    "Os votos são públicos e cada pessoa pode votar apenas uma vez\\.",
  description: () => "📊 Criar enquete de votação com opções padrão.",
};
