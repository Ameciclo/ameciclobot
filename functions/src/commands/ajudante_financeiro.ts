import { Context, Markup, Telegraf } from "telegraf";

export function registerAjudanteFinanceiroCommand(bot: Telegraf) {
  bot.command("ajudante_financeiro", async (ctx: Context) => {
    try {
      const message = ctx.message as any;
      
      // Verifica se é resposta a um arquivo
      if (message?.reply_to_message?.document) {
        const text = ctx.text || "";
        const match = text.match(/\/ajudante_financeiro(?:@\w+)?\s+(.+)/);
        
        // Se tem ID após o comando, pergunta se quer arquivar comprovante ou fazer recibo
        if (match && match[1]) {
          const requestId = match[1].trim();
          
          const keyboard = Markup.inlineKeyboard([
            [
              Markup.button.callback("📎 Arquivar Comprovante", `ajudante_arquivar_comprovante_${requestId}`),
              Markup.button.callback("📄 Recibo Ressarcimento", `ajudante_recibo_ressarcimento_${requestId}`)
            ],
            [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
          ]);
          
          return ctx.reply(
            `📁 *Arquivo com ID detectado!*\n\n` +
            `ID da transação: \`${requestId}\`\n\n` +
            `O que você deseja fazer?\n\n` +
            `• *Arquivar Comprovante*: Arquiva comprovante de pagamento\n` +
            `• *Recibo Ressarcimento*: Gera recibo de ressarcimento com notas fiscais`,
            { ...keyboard, parse_mode: "Markdown" }
          );
        }
        
        // Se não tem ID, pergunta o que fazer com o arquivo
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback("📊 Arquivar Extrato PDF", "ajudante_arquivar_extrato"),
            Markup.button.callback("💰 Processar Extrato", "ajudante_processar_extrato")
          ],
          [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
        ]);
        
        return ctx.reply(
          "📁 *Arquivo detectado!*\n\n" +
          "O que você deseja fazer com este arquivo?\n\n" +
          "• *Arquivar Extrato PDF*: Arquiva um extrato bancário em PDF no Google Drive\n" +
          "• *Processar Extrato*: Processa extratos CSV/TXT e adiciona na planilha financeira\n\n" +
          "💡 *Dica*: Para arquivar comprovante ou gerar recibo de ressarcimento, use:\n" +
          "`/ajudante_financeiro [id_transacao]`",
          { ...keyboard, parse_mode: "Markdown" }
        );
      }
      
      // Se não é resposta a arquivo, mostra opções principais
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("📋 Atualizar Pendências", "ajudante_pendencias"),
          Markup.button.callback("🔄 Atualizar Projetos", "ajudante_projetos")
        ],
        [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
      ]);
      
      return ctx.reply(
        "🤖 *Ajudante Financeiro*\n\n" +
        "Este assistente unifica 6 comandos financeiros:\n\n" +
        "*📎 Arquivar Comprovante*\n" +
        "Use respondendo a um comprovante: `/ajudante_financeiro [id_pagamento]`\n\n" +
        "*📄 Recibo de Ressarcimento*\n" +
        "Use respondendo a um PDF: `/ajudante_financeiro [id_ressarcimento]`\n\n" +
        "*📊 Arquivar Extrato PDF*\n" +
        "Use respondendo a um PDF de extrato bancário\n\n" +
        "*💰 Processar Extrato*\n" +
        "Use respondendo a um arquivo CSV/TXT de extrato\n\n" +
        "*📋 Atualizar Pendências*\n" +
        "Verifica pendências dos projetos por status\n\n" +
        "*🔄 Atualizar Projetos*\n" +
        "Atualiza dados dos projetos no Firebase\n\n" +
        "Escolha uma opção:",
        { ...keyboard, parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Erro no ajudante financeiro:", error);
      return ctx.reply("Ocorreu um erro. Tente novamente.");
    }
  });
}

export const ajudanteFinanceiroCommand = {
  register: registerAjudanteFinanceiroCommand,
  name: () => "/ajudante_financeiro",
  help: () => 
    "Assistente que unifica os comandos financeiros: arquivar_comprovante, recibo_de_ressarcimento, arquivar_extrato_pdf, processar_extrato, atualizar_pendencias e atualizar_projetos.",
  description: () => "🤖 Assistente financeiro unificado para todas as operações financeiras.",
};