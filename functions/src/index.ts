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

import { eventoCommand } from "./commands/evento";
import { pagamentoCommand } from "./commands/pagamento";

import { registerCalendarHandler } from "./callbacks/confirmEventParticipationCallback";
import { registerConfirmPaymentHandler } from "./callbacks/confirmPaymentCallback";
import { registerCancelPaymentHandler } from "./callbacks/cancelPaymentCallback";
import { registerModeloUseCallback } from "./callbacks/modeloChooserCallback";

import { checkGoogleForms } from "./scheduler/checkForms";
import { onSchedule } from "firebase-functions/scheduler";
import { commandsList } from "./utils/commands";

const validCommands = commandsList;
validCommands.forEach((cmd) => {
  cmd.register(bot);
});

eventoCommand.register(bot);
pagamentoCommand.register(bot);

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
registerCalendarHandler(bot);
registerCancelPaymentHandler(bot);
registerConfirmPaymentHandler(bot);

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
  "every 2 hours", // Agenda para rodar a cada 6 horas
  async (context) => {
    console.log(
      "RUN: scheduledCheckGoogleForms disparado em",
      new Date().toISOString()
    );
    await checkGoogleForms(bot);
  }
);

// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(async (req, res) => {
  console.log(req.body);
  bot.handleUpdate(req.body, res);
});

console.log("RUN: ... bot iniciado com sucesso!");