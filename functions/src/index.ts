/*
 * Ameciclo Bot - Telegram Bot for Ameciclo (Associação Metropolitana de Ciclistas do Recife)
 * Copyright (C) 2024 Ameciclo
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Inicializa o Firebase Admin SDK
import { admin } from "./config/firebaseInit";
console.log(admin);
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/v2/database";

import { bot } from "./config/bot";
import { PaymentRequest } from "./config/types";

import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";
import { handleCreateEvent } from "./handlers/createEventHandler";

import { getCoordinators } from "./services/firebase";
import workgroups from "./credentials/workgroupsfolders.json";
import projectsSpreadsheet from "./credentials/projectsSpreadsheet.json";

import { onSchedule } from "firebase-functions/v2/scheduler";
import { runHighFrequencyScheduler } from "./scheduler/high_frequency_scheduler_index";
import { runDailyScheduler } from "./scheduler/daily_scheduler_index";
import { runWeeklyFrequencyScheduler } from "./scheduler/weekly_frequency_scheduler_index";

import { registerAllCommands, setTelegramCommands } from "./commandsRegister";
import { registerAllCallbacks } from "./callbacksRegister";
import { handleAutoTranscription } from "./commands/transcrever";
import { message } from 'telegraf/filters';
import { BOT_VERSION } from "./config/version";



// Registra handler de auto-transcrição (forma moderna)
bot.on(message('voice'), handleAutoTranscription);


registerAllCommands(bot);
registerAllCallbacks(bot);


setTelegramCommands(bot);

// Função disparada ao criar um novo request no Realtime Database - v4
export const sendPaymentRequest = onValueCreated(
  {
    ref: "/requests/{requestId}",
    region: "us-central1"
  },
  async (event) => {
    const financeiroGroup = workgroups.find(
      (group: any) => group.label === projectsSpreadsheet.workgroup
    );
    const coordinators = await getCoordinators();
    const groupChatId = financeiroGroup!.value;
    const snapshot = event.data;
    const request = snapshot.val() as PaymentRequest;

    return sendPaymentRequestHandler(bot, request, groupChatId, coordinators);
  }
);

export const createCalendarEvent = onValueCreated(
  {
    ref: "/calendar/{eventId}",
    region: "us-central1"
  },
  async (event) => {
    await handleCreateEvent(event, bot);
  }
);

// Scheduler de alta frequência - a cada 30 minutos
export const highFrequencyScheduler = onSchedule(
  {
    schedule: "every 30 minutes",
    region: "us-central1"
  },
  async (context) => {
    await runHighFrequencyScheduler(bot);
  }
);

// Scheduler diário - às 16:20
export const dailyScheduler = onSchedule(
  { 
    schedule: "20 16 * * *", 
    timeZone: "America/Recife",
    region: "us-central1"
  },
  async (context) => {
    await runDailyScheduler(bot);
  }
);

// Scheduler semanal - seg/qua/sex às 8h (+ relatório semanal nas segundas)
export const weeklyFrequencyScheduler = onSchedule(
  { 
    schedule: "0 8 * * 1,3,5", 
    timeZone: "America/Recife",
    region: "us-central1"
  },
  async (context) => {
    await runWeeklyFrequencyScheduler(bot);
  }
);

// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(
  {
    region: "us-central1"
  },
  async (req, res) => {
    bot.handleUpdate(req.body, res);
  }
);

console.log(`RUN: ... bot iniciado com sucesso! v${BOT_VERSION}`);
