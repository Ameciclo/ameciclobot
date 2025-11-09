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
import { checkGoogleForms } from "./scheduler/checkForms";
import { checkScheduledPayments } from "./scheduler/checkScheduledPayments";
import { checkEvents } from "./scheduler/checkEvents";
import { checkUpcomingEvents } from "./scheduler/checkUpcomingEvents";
import { checkPedidosInformacao } from "./scheduler/checkPedidosInformacao";
import { sendWeeklyReport } from "./scheduler/weeklyReport";

import { registerAllCommands, setTelegramCommands } from "./commandsRegister";
import { registerAllCallbacks } from "./callbacksRegister";
import { BOT_VERSION } from "./config/version";

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

export const scheduledCheckGoogleForms = onSchedule(
  {
    schedule: "every 2 hours",
    region: "us-central1"
  },
  async (context) => {
    console.log(
      "RUN: scheduledCheckGoogleForms disparado em",
      new Date().toISOString()
    );
    await checkGoogleForms(bot);
  }
);

export const scheduledCheckScheduledPayments = onSchedule(
  { 
    schedule: "0 8 * * 1,3,5", 
    timeZone: "America/Recife",
    region: "us-central1"
  },
  async (context) => {
    console.log(
      "RUN: scheduledCheckScheduledPayments disparado em",
      new Date().toISOString()
    );
    await checkScheduledPayments(bot);
  }
);

export const scheduledCheckEvents = onSchedule(
  { 
    schedule: "20 16 * * *", 
    timeZone: "America/Recife",
    region: "us-central1"
  },
  async (context) => {
    console.log(
      "RUN: scheduledCheckEvents disparado em",
      new Date().toISOString()
    );
    await checkEvents(bot);
  }
);

export const scheduledCheckPedidosInformacao = onSchedule(
  { 
    schedule: "0 19 * * *", 
    timeZone: "America/Recife",
    region: "us-central1"
  },
  async (context) => {
    console.log(
      "RUN: scheduledCheckPedidosInformacao disparado em",
      new Date().toISOString()
    );
    await checkPedidosInformacao(bot);
  }
);

export const scheduledCheckUpcomingEvents = onSchedule(
  {
    schedule: "every 30 minutes",
    region: "us-central1"
  },
  async (context) => {
    console.log(
      "RUN: scheduledCheckUpcomingEvents disparado em",
      new Date().toISOString()
    );
    await checkUpcomingEvents(bot);
  }
);

export const scheduledWeeklyReport = onSchedule(
  {
    schedule: "0 8 * * 1",
    timeZone: "America/Recife",
    region: "us-central1"
  },
  async (context) => {
    console.log(
      "RUN: scheduledWeeklyReport disparado em",
      new Date().toISOString()
    );
    await sendWeeklyReport(bot);
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
