import { Context, Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { sendWeeklyReport } from "../scheduler/weeklyReport";
import { checkEvents } from "../scheduler/checkEvents";
import { checkGoogleForms } from "../scheduler/checkForms";
import { checkPedidosInformacao } from "../scheduler/checkPedidosInformacao";
import { checkScheduledPayments } from "../scheduler/checkScheduledPayments";
import { checkUpcomingEvents } from "../scheduler/checkUpcomingEvents";

const schedulers = [
  { key: "weekly_report", name: "📊 Relatório Semanal", func: sendWeeklyReport },
  { key: "check_events", name: "📅 Verificar Eventos", func: checkEvents },
  { key: "check_forms", name: "📝 Verificar Formulários", func: checkGoogleForms },
  { key: "check_payments", name: "💰 Verificar Pagamentos", func: checkScheduledPayments },
  { key: "check_pedidos", name: "📋 Verificar Pedidos de Informação", func: checkPedidosInformacao },
  { key: "check_upcoming", name: "⏰ Verificar Eventos Próximos", func: checkUpcomingEvents }
];

function registerExecutarSchedulerCommand(bot: Telegraf) {
  bot.command("executar_scheduler", async (ctx: Context) => {
    const buttons = schedulers.map(scheduler => 
      [Markup.button.callback(scheduler.name, `exec_${scheduler.key}`)]
    );
    
    await ctx.reply(
      "🤖 Escolha qual scheduler executar:", 
      Markup.inlineKeyboard(buttons)
    );
  });

  // Handlers para os botões
  schedulers.forEach(scheduler => {
    bot.action(`exec_${scheduler.key}`, async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await ctx.editMessageText(`🔄 Executando ${scheduler.name}...`);
        
        await scheduler.func(bot);
        
        await ctx.editMessageText(`✅ ${scheduler.name} executado com sucesso!`);
      } catch (err) {
        console.error(`[executar_scheduler] Erro ao executar ${scheduler.key}:`, err);
        await ctx.editMessageText(`❌ Erro ao executar ${scheduler.name}: ${err}`);
      }
    });
  });
}

export const executarSchedulerCommand = {
  register: registerExecutarSchedulerCommand,
  name: () => "/executar_scheduler",
  help: () => "Executa manualmente qualquer scheduler disponível.",
  description: () => "🤖 Executar schedulers manualmente."
};