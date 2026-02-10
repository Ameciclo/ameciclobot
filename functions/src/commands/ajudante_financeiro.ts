import { Context, Markup, Telegraf } from "telegraf";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";
import workgroups from "../credentials/workgroupsfolders.json";

export function registerAjudanteFinanceiroCommand(bot: Telegraf) {
  bot.command("ajudante_financeiro", async (ctx: Context) => {
    try {
      console.log("[ajudante_financeiro] Comando /ajudante_financeiro executado - v2");
      console.log("[ajudante_financeiro] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
      // Validação do grupo financeiro primeiro
      const currentChatId = ctx.chat?.id?.toString();
      const financeiroGroup = workgroups.find(
        (group: any) => group.label === projectsSpreadsheet.workgroup
      );

      if (!financeiroGroup || currentChatId !== financeiroGroup.value) {
        return ctx.reply("❌ Este comando só pode ser executado no grupo Financeiro.");
      }

      const message = ctx.message as any;
      
      // Verifica se é resposta a um arquivo
      if (message?.reply_to_message?.document) {
        const text = ctx.text || "";
        const match = text.match(/\/ajudante_financeiro(?:@\w+)?\s+(.+)/);
        const fileId = message.reply_to_message.document.file_id;
        
        // Se tem ID após o comando, mostra tipos de comprovante diretamente
        if (match && match[1]) {
          const requestId = match[1].trim();
          
          const keyboard = Markup.inlineKeyboard([
            [
              Markup.button.callback("📄 Arquivar como Nota Fiscal", `rt_${requestId}_nf`),
              Markup.button.callback("🧾 Arquivar como Cupom Fiscal", `rt_${requestId}_cf`)
            ],
            [
              Markup.button.callback("📋 Arquivar como Recibo", `rt_${requestId}_r`),
              Markup.button.callback("📎 Arquivar como Outro", `rt_${requestId}_o`)
            ],
            [
              Markup.button.callback("📄 Gerar Recibo de Ressarcimento", "recibo_ressarcimento")
            ],
            [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
          ]);
          
          console.log(`[ajudante_financeiro] Arquivo com ID detectado: ${requestId}, File ID: ${fileId}`);
          
          return ctx.reply(
            `📁 *Arquivo com ID detectado!*\n\n` +
            `ID da transação: \`${requestId}\`\n` +
            `File ID: \`${fileId}\`\n\n` +
            `Escolha o tipo de comprovante:\n\n` +
            `• *Nota Fiscal*: Arquiva como nota fiscal\n` +
            `• *Cupom Fiscal*: Arquiva como cupom fiscal\n` +
            `• *Recibo*: Arquiva como recibo\n` +
            `• *Outro*: Arquiva como outro tipo de comprovante\n` +
            `• *Gerar Recibo de Ressarcimento*: Cria recibo de ressarcimento`,
            { ...keyboard, parse_mode: "Markdown" }
          );
        }
        
        // Se não tem ID, pergunta o que fazer com o arquivo
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback("📊 Arquivar Extrato PDF", "arquivar_extrato"),
            Markup.button.callback("💰 Processar Extrato", "processar_extrato")
          ],
          [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
        ]);
        
        console.log(`[ajudante_financeiro] Arquivo detectado sem ID, File ID: ${fileId}`);
        
        return ctx.reply(
          `📁 *Arquivo detectado!*\n\n` +
          `File ID: \`${fileId}\`\n\n` +
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
          Markup.button.callback("📋 Atualizar Pendências", "atualizar_pendencias"),
          Markup.button.callback("🔄 Atualizar Projetos", "atualizar_projetos")
        ],
        [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
      ]);
      
      console.log("[ajudante_financeiro] Interface principal do ajudante financeiro exibida");
      
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
      console.error("[ajudante_financeiro] Erro no ajudante financeiro:", error);
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