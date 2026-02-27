/*
 * Ameciclo Bot - High Frequency Scheduler Index
 * Executa a cada 30 minutos: checkUpcomingEvents e checkGoogleForms
 */

import { Telegraf } from "telegraf";
import { checkUpcomingEvents } from "./checkUpcomingEvents";
import { checkGoogleForms } from "./checkForms";

export async function runHighFrequencyScheduler(bot: Telegraf): Promise<void> {
  const now = new Date();
  console.log(`RUN: High Frequency Scheduler executado em ${now.toISOString()}`);

  try {
    // Executa checkUpcomingEvents
    console.log("Executando checkUpcomingEvents...");
    await checkUpcomingEvents(bot);

    // Executa checkGoogleForms
    console.log("Executando checkGoogleForms...");
    await checkGoogleForms(bot);

    console.log("High Frequency Scheduler concluído com sucesso");
  } catch (error) {
    console.error("Erro no High Frequency Scheduler:", error);
    throw error;
  }
}