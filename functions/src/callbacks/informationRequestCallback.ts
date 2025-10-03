import { Telegraf } from "telegraf";
import { updateRequestStatus } from "../services/firebase";

export function registerInformationRequestCallback(bot: Telegraf) {
  bot.action(/^accept_response_(.+)$/, async (ctx) => {
    try {
      const requestKey = ctx.match[1];
      
      await updateRequestStatus(requestKey, 'aceito', true);
      
      await ctx.editMessageText(
        `✅ **Resposta aceita!**\n\nSeu pedido foi finalizado e não será mais verificado automaticamente.`,
        { parse_mode: 'Markdown' }
      );
      
      await ctx.answerCbQuery('Resposta aceita com sucesso!');
    } catch (error) {
      console.error('Erro ao aceitar resposta:', error);
      await ctx.answerCbQuery('Erro ao processar sua resposta.');
    }
  });

  bot.action(/^appeal_response_(.+)$/, async (ctx) => {
    try {
      const requestKey = ctx.match[1];
      
      await updateRequestStatus(requestKey, 'recorrencia', true);
      
      await ctx.editMessageText(
        `📝 **Recurso registrado!**\n\nSeu pedido continuará sendo monitorado para verificar atualizações do recurso.`,
        { parse_mode: 'Markdown' }
      );
      
      await ctx.answerCbQuery('Recurso registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar recurso:', error);
      await ctx.answerCbQuery('Erro ao processar sua resposta.');
    }
  });
}