// Inicializa o Firebase Admin SDK
import { admin } from "./config/firebaseInit";
console.log(admin);
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/database";

import { bot, setupCommands } from "./config/bot";
import { PaymentRequest } from "./config/types";

import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";
import { handleCreateEvent } from "./handlers/createEventHandler";

import { registerIniciarCommand, registerStartCommand } from "./commands/start";
import { registerAjudaCommand, registerHelpCommand } from "./commands/help";
import { getCoordinators, getFinancesGroupId } from "./services/firebase";
import { registerQuemSouEuCommand } from "./commands/quemsoueu";
import { registerPautaCommand } from "./commands/pauta";
import { registerInformeCommand } from "./commands/informe";
import { registerClippingCommand } from "./commands/clipping";
import { registerDemandaCommand } from "./commands/demanda";
import { registerEncaminhamentoCommand } from "./commands/encaminhamentos";

import { registerConfirmPaymentHandler } from "./callbacks/confirmPaymentCallback";
import { registerCancelPaymentHandler } from "./callbacks/cancelPaymentCallback";
import { registerCalendarHandler } from "./callbacks/confirmEventParticipationCallback";

// ATIVAR QUANDO ALTERAR COMANDOS
setupCommands();

// Registro dos comandos
registerAjudaCommand(bot);
registerClippingCommand(bot);
registerDemandaCommand(bot);
registerEncaminhamentoCommand(bot);
registerHelpCommand(bot);
registerInformeCommand(bot);
registerIniciarCommand(bot);
registerPautaCommand(bot);
registerQuemSouEuCommand(bot);
registerStartCommand(bot);

registerCancelPaymentHandler(bot);
registerConfirmPaymentHandler(bot);
registerCalendarHandler(bot);

// Função disparada ao criar um novo request no Realtime Database
export const sendPaymentRequest = onValueCreated(
  "/requests/{requestId}",
  async (event) => {
    const coordinators = await getCoordinators();
    const groupChatId = await getFinancesGroupId();
    const snapshot = event.data;
    const request = snapshot.val() as PaymentRequest;

    return sendPaymentRequestHandler(
      bot,
      request,
      groupChatId,
      coordinators
    );
  }
);

export const createCalendarEvent = onValueCreated(
  "/calendar/{eventId}",
  async (event) => {
    await handleCreateEvent(event, bot);
  }
);

// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(async (req, res) => {
  console.log(req.body);
  bot.handleUpdate(req.body, res);
});

console.log("RUN: ... bot iniciado com sucesso!");
