// Inicializa o Firebase Admin SDK
import { admin } from "./config/firebaseInit";
console.log(admin);
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/database";

import { bot } from "./config/bot";
import { PaymentRequest } from "./config/types";

import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";
import { handleCreateEvent } from "./handlers/createEventHandler";

import { registerIniciarCommand, registerStartCommand } from "./commands/start";
import { registerAjudaCommand, registerHelpCommand } from "./commands/help";
import { getCoordinators, getFinancesGroupId } from "./services/firebase";

import { registerEventParticipationCallback } from "./callbacks/confirmEventParticipationCallback";
import { registerConfirmPaymentCallback } from "./callbacks/confirmPaymentCallback";
import { registerCancelPaymentCallback } from "./callbacks/cancelPaymentCallback";
import { registerModeloUseCallback } from "./callbacks/modeloChooserCallback";

import { onSchedule } from "firebase-functions/scheduler";
import { checkGoogleForms } from "./scheduler/checkForms";
import { checkScheduledPayments } from "./scheduler/checkScheduledPayments";
import { checkEvents } from "./scheduler/checkEvents";

import { commandsList } from "./commands";
import { registerEventCallback } from "./callbacks/eventCallback";
import { pagamentoCommand } from "./commands/pagamento";
import { atualizarExtratosCommand } from "./commands/atualizar_extratos";
import { atualizarProjetosCommand } from "./commands/atualizar_projetos";
import { verificarPendenciasCommand } from "./commands/atualizar_pendencias";

const validCommands = commandsList;
validCommands.forEach((cmd) => {
  cmd.register(bot);
});

pagamentoCommand.register(bot);
atualizarExtratosCommand.register(bot);
atualizarProjetosCommand.register(bot);
verificarPendenciasCommand.register(bot);

const telegramCommands = validCommands.map((cmd) => ({
  command: cmd.name(),
  description: cmd.description(),
}));
bot.telegram.setMyCommands(telegramCommands);

registerAjudaCommand(bot);
registerHelpCommand(bot);
registerIniciarCommand(bot);
registerStartCommand(bot);

registerModeloUseCallback(bot);
registerEventParticipationCallback(bot);
registerCancelPaymentCallback(bot);
registerConfirmPaymentCallback(bot);
registerEventCallback(bot);

// Função disparada ao criar um novo request no Realtime Database
export const sendPaymentRequest = onValueCreated(
  "/requests/{requestId}",
  async (event) => {
    const coordinators = await getCoordinators();
    const groupChatId = await getFinancesGroupId();
    const snapshot = event.data;
    const request = snapshot.val() as PaymentRequest;

    return sendPaymentRequestHandler(bot, request, groupChatId, coordinators);
  }
);

export const createCalendarEvent = onValueCreated(
  "/calendar/{eventId}",
  async (event) => {
    await handleCreateEvent(event, bot);
  }
);

export const scheduledCheckGoogleForms = onSchedule(
  "every 2 hours",
  async (context) => {
    console.log(
      "RUN: scheduledCheckGoogleForms disparado em",
      new Date().toISOString()
    );
    await checkGoogleForms(bot);
  }
);

export const scheduledCheckScheduledPayments = onSchedule(
  { schedule: "0 8 * * 1,3,5", timeZone: "America/Recife" },
  async (context) => {
    console.log(
      "RUN: scheduledCheckScheduledPayments disparado em",
      new Date().toISOString()
    );
    await checkScheduledPayments(bot);
  }
);

export const scheduledCheckEvents = onSchedule(
  { schedule: "20 16 * * *", timeZone: "America/Recife" },
  async (context) => {
    console.log(
      "RUN: scheduledCheckEvents disparado em",
      new Date().toISOString()
    );
    await checkEvents(bot);
  }
);

// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(async (req, res) => {
  console.log(req.body);
  bot.handleUpdate(req.body, res);
});

console.log("RUN: ... bot iniciado com sucesso!");
