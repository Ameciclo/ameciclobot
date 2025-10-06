import { Telegraf, Markup } from "telegraf";

export function registerAjudanteFinanceiroCallback(bot: Telegraf) {
  // Callback para arquivar comprovante com ID
  bot.action(/^ajudante_arquivar_comprovante_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `📎 *Arquivando Comprovante*\n\n` +
        `Para arquivar o comprovante com ID \`${requestId}\`, use:\n\n` +
        `\`/arquivar_comprovante ${requestId}\`\n\n` +
        `como resposta ao arquivo de comprovante.`,
      { parse_mode: "Markdown" }
    );
  });

  // Callback para recibo de ressarcimento com ID
  bot.action(/^ajudante_recibo_ressarcimento_(.+)$/, async (ctx) => {
    const requestId = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `📄 *Gerando Recibo de Ressarcimento*\n\n` +
        `Para gerar o recibo com ID \`${requestId}\`, use:\n\n` +
        `\`/recibo_de_ressarcimento ${requestId}\`\n\n` +
        `como resposta ao PDF das notas fiscais.`,
      { parse_mode: "Markdown" }
    );
  });

  // Callback para arquivar extrato PDF
  bot.action("ajudante_arquivar_extrato", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      "📊 *Arquivando Extrato PDF*\n\n" +
        "Para arquivar o extrato PDF, use o comando:\n\n" +
        "`/arquivar_extrato_pdf`\n\n" +
        "como resposta ao arquivo PDF.",
      { parse_mode: "Markdown" }
    );
  });

  // Callback para processar extrato
  bot.action("ajudante_processar_extrato", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      "💰 *Processando Extrato*\n\n" +
        "Para processar o extrato, use o comando:\n\n" +
        "`/processar_extrato`\n\n" +
        "como resposta ao arquivo CSV ou TXT.",
      { parse_mode: "Markdown" }
    );
  });

  // Callback para atualizar pendências
  bot.action("ajudante_pendencias", async (ctx) => {
    await ctx.answerCbQuery();

    const keyboard = Markup.inlineKeyboard([
      [
        { text: "📋 Todos", callback_data: "pendencias_status_Todos" },
        {
          text: "✅ Finalizado",
          callback_data: "pendencias_status_Finalizado",
        },
      ],
      [
        {
          text: "🔄 Em andamento",
          callback_data: "pendencias_status_Em andamento",
        },
        {
          text: "⏸️ Não iniciado",
          callback_data: "pendencias_status_Não iniciado",
        },
      ],
      [
        {
          text: "💰 Finalizado com sobras",
          callback_data: "pendencias_status_Finalizado com sobras",
        },
      ],
      [
        {
          text: "📄 Listar Em Andamento",
          callback_data: "pendencias_list_projects",
        },
      ],
      [{ text: "❌ Cancelar", callback_data: "ajudante_cancel" }],
    ]);

    await ctx.editMessageText(
      "📋 *Atualizar Pendências de Projetos*\n\n" +
        "Selecione o status dos projetos que deseja verificar:\n\n" +
        "💡 *Dica:* Para verificar um projeto específico, use:\n" +
        "`/atualizar_pendencias nome_do_projeto`",
      { reply_markup: keyboard.reply_markup, parse_mode: "Markdown" }
    );
  });

  // Callback para atualizar projetos
  bot.action("ajudante_projetos", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      "🔄 *Atualizando Projetos...*\n\nProcessando...",
      { parse_mode: "Markdown" }
    );

    try {
      await ctx.editMessageText(
        "🔄 *Atualizar Projetos*\n\n" +
          "Para atualizar os dados dos projetos no Firebase, use:\n\n" +
          "`/atualizar_projetos`\n\n" +
          "Este comando lê a planilha RESUMO e atualiza os projetos com status 'Em andamento'.",
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      await ctx.editMessageText(
        "Erro ao processar. Use o comando `/atualizar_projetos` diretamente.",
        { parse_mode: "Markdown" }
      );
    }
  });

  // Callback para cancelar
  bot.action("ajudante_cancel", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("❌ Operação cancelada.", { parse_mode: "Markdown" });
  });
}
