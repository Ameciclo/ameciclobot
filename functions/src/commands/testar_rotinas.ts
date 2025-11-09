import { Context, Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { sendWeeklyReport } from "../scheduler/weeklyReport";
import { checkEvents } from "../scheduler/checkEvents";
import { checkGoogleForms } from "../scheduler/checkForms";
import { checkPedidosInformacao } from "../scheduler/checkPedidosInformacao";
import { checkScheduledPayments } from "../scheduler/checkScheduledPayments";
import { checkUpcomingEvents } from "../scheduler/checkUpcomingEvents";
import { getEventsForPeriod } from "../services/google";
import { escapeMarkdownV2 } from "../utils/utils";

// Versão de teste para eventos que mostra hoje E amanhã
async function checkEventsTestMode(bot: Telegraf, privateChatId?: number) {
  console.log("[TESTE] Verificando eventos de hoje e amanhã...");
  try {
    const today = new Date();
    
    // Eventos de HOJE
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayEvents = await getEventsForPeriod(todayStart, todayEnd);
    
    // Eventos de AMANHÃ
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(today.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);
    
    const tomorrowEvents = await getEventsForPeriod(tomorrowStart, tomorrowEnd);
    
    let message = `📅 **[TESTE] Agenda de Eventos:**\n\n`;
    
    if (todayEvents.length > 0) {
      message += `**🗓️ HOJE (${today.toLocaleDateString('pt-BR')}):**\n`;
      todayEvents.forEach(event => {
        const time = new Date(event.start.dateTime || event.start.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        message += `• ${time} - ${event.summary}\n`;
      });
      message += `\n`;
    }
    
    if (tomorrowEvents.length > 0) {
      message += `**🗓️ AMANHÃ (${tomorrowStart.toLocaleDateString('pt-BR')}):**\n`;
      tomorrowEvents.forEach(event => {
        const time = new Date(event.start.dateTime || event.start.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        message += `• ${time} - ${event.summary}\n`;
      });
    }
    
    if (todayEvents.length === 0 && tomorrowEvents.length === 0) {
      message += `Nenhum evento encontrado para hoje ou amanhã.`;
    }
    
    await bot.telegram.sendMessage(privateChatId!, message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Erro no teste de eventos:", error);
  }
}

// Versão de teste que NÃO marca eventos como notificados
async function checkUpcomingEventsTestMode(bot: Telegraf, privateChatId?: number) {
  console.log("[TESTE] Verificando eventos próximos sem marcar como notificados...");
  try {
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
    const in35Minutes = new Date(now.getTime() + 35 * 60 * 1000);

    const events = await getEventsForPeriod(in30Minutes, in35Minutes);
    
    if (events.length === 0) {
      await bot.telegram.sendMessage(privateChatId!, "🔔 Nenhum evento encontrado nos próximos 30 minutos.");
      return;
    }

    for (const event of events) {
      const title = event.summary || "Evento";
      const location = event.location || "Local não informado";
      const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Recife",
      });

      const message = `🔔 *[TESTE] Evento em 30 minutos\\!*\n\n` +
                     `📅 *${escapeMarkdownV2(title)}*\n` +
                     `🕐 *Horário:* ${escapeMarkdownV2(startTime)}\n` +
                     `📍 *Local:* ${escapeMarkdownV2(location)}`;

      await bot.telegram.sendMessage(privateChatId!, message, {
        parse_mode: "MarkdownV2",
      } as any);
    }
  } catch (error) {
    console.error("Erro no teste de eventos próximos:", error);
  }
}

const schedulers = [
  { key: "weekly_report", name: "📊 Relatório Semanal", func: sendWeeklyReport },
  { key: "check_events", name: "📅 Verificar Eventos", func: checkEvents },
  { key: "check_forms", name: "📝 Verificar Formulários", func: checkGoogleForms },
  { key: "check_payments", name: "💰 Verificar Pagamentos", func: checkScheduledPayments },
  { key: "check_pedidos", name: "📋 Verificar Pedidos de Informação", func: checkPedidosInformacao },
  { key: "check_upcoming", name: "⏰ Verificar Eventos Próximos", func: checkUpcomingEvents }
];

function registerTestarRotinasCommand(bot: Telegraf) {
  bot.command("testar_rotinas", async (ctx: Context) => {
    console.log("[testar_rotinas] Comando /testar_rotinas executado");
    console.log("[testar_rotinas] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
    
    // Verificar se é chat privado
    if (ctx.chat?.type !== 'private') {
      await ctx.reply("❌ Este comando só pode ser usado no chat privado do bot.");
      return;
    }

    const buttons = schedulers.map(scheduler => 
      [Markup.button.callback(scheduler.name, `exec_${scheduler.key}`)]
    );
    
    console.log("[testar_rotinas] Interface de teste de rotinas exibida");
    
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
        
        // Executar scheduler enviando mensagens no chat privado
        if (scheduler.key === 'check_upcoming') {
          await checkUpcomingEventsTestMode(bot, ctx.chat?.id);
        } else if (scheduler.key === 'check_events') {
          await checkEventsTestMode(bot, ctx.chat?.id);
        } else {
          await scheduler.func(bot, ctx.chat?.id);
        }
        
        console.log(`[testar_rotinas] Scheduler ${scheduler.key} executado com sucesso`);
        await ctx.editMessageText(`✅ ${scheduler.name} executado com sucesso!`);
      } catch (err) {
        console.error(`[testar_rotinas] Erro ao executar ${scheduler.key}:`, err);
        await ctx.editMessageText(`❌ Erro ao executar ${scheduler.name}: ${err}`);
      }
    });
  });
}

export const testarRotinasCommand = {
  register: registerTestarRotinasCommand,
  name: () => "/testar_rotinas",
  help: () => "Testa manualmente qualquer rotina automática disponível.",
  description: () => "🤖 Testar rotinas automáticas manualmente."
};