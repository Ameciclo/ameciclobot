/*
 * Ameciclo Bot - Weekly Frequency Scheduler Index
 * Executa seg/qua/sex às 8h: checkScheduledPayments
 * Se for segunda-feira, também executa: sendWeeklyReport + updateFolderStructures
 */

import { Telegraf } from "telegraf";
import { checkScheduledPayments } from "./checkScheduledPayments";
import { sendWeeklyReport } from "./weeklyReport";
import { updateFolderStructures } from "./updateFolderStructures";

export async function runWeeklyFrequencyScheduler(bot: Telegraf): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, etc.
  
  console.log(`RUN: Weekly Frequency Scheduler executado em ${now.toISOString()}`);
  console.log(`Dia da semana: ${dayOfWeek} (1=segunda)`);

  try {
    // Sempre executa checkScheduledPayments
    console.log("Executando checkScheduledPayments...");
    await checkScheduledPayments(bot);

    // Se for segunda-feira (dayOfWeek === 1), executa também o relatório semanal e atualização de pastas
    if (dayOfWeek === 1) {
      console.log("É segunda-feira! Executando sendWeeklyReport...");
      await sendWeeklyReport(bot);
      
      console.log("Executando updateFolderStructures...");
      await updateFolderStructures(bot);
    } else {
      console.log("Não é segunda-feira, pulando sendWeeklyReport e updateFolderStructures");
    }

    console.log("Weekly Frequency Scheduler concluído com sucesso");
  } catch (error) {
    console.error("Erro no Weekly Frequency Scheduler:", error);
    throw error;
  }
}