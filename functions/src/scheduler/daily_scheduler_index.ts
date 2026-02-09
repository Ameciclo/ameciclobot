/*
 * Ameciclo Bot - Daily Scheduler Index
 * Executa diariamente às 16:20: checkEvents e checkPedidosInformacao
 */

import { Telegraf } from "telegraf";
import { checkEvents } from "./checkEvents";
import { checkPedidosInformacao } from "./checkPedidosInformacao";

export async function runDailyScheduler(bot: Telegraf): Promise<void> {
  const now = new Date();
  console.log(`RUN: Daily Scheduler executado em ${now.toISOString()}`);

  try {
    // Executa checkEvents
    console.log("Executando checkEvents...");
    await checkEvents(bot);

    // Executa checkPedidosInformacao
    console.log("Executando checkPedidosInformacao...");
    await checkPedidosInformacao(bot);

    console.log("Daily Scheduler concluído com sucesso");
  } catch (error) {
    console.error("Erro no Daily Scheduler:", error);
    throw error;
  }
}