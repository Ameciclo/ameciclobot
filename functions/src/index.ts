import * as admin from "firebase-admin";
import { bot, setupCommands } from "./config/bot";
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/database";
import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";
import { registerIniciarCommand, registerStartCommand } from "./commands/start";
import { registerAjudaCommand, registerHelpCommand } from "./commands/help";
import { getCoordinatorsId, getFinancesGroupId } from "./services/firebase";
import { registerCancelPaymentHandler } from "./handlers/cancelPaymentHandler";
import { registerQuemSouEuCommand } from "./commands/quemsoueu";
import { registerPautaCommand } from "./commands/pauta";
import { registerInformeCommand } from "./commands/informe";
import { registerClippingCommand } from "./commands/clipping";
import { registerDemandaCommand } from "./commands/demanda";
import { registerEncaminhamentoCommand } from "./commands/encaminhamentos";
import { handleCreateEvent } from "./handlers/createEventHandler";
import { registerConfirmPaymentHandler } from "./handlers/confirmPaymentHandler";
import { PaymentRequest } from "./config/types";

// Inicializa o Firebase Admin SDK
admin.initializeApp();

export { admin };

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

// Função disparada ao criar um novo request no Realtime Database
export const sendPaymentRequest = onValueCreated(
  "/requests/{requestId}",
  async (event) => {
    const coordinators = await getCoordinatorsId();
    const groupChatId = await getFinancesGroupId();
    const snapshot = event.data;
    const params = { requestId: event.params.requestId };
    const request = snapshot.val() as PaymentRequest;

    return sendPaymentRequestHandler(
      request,
      params,
      bot,
      groupChatId,
      coordinators
    );
  }
);

export const createCalendarEvent = onValueCreated(
  "/calendar/{eventId}",
  async (event) => {
    await handleCreateEvent(event);
  }
);

// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(async (req, res) => {
  bot.handleUpdate(req.body, res);
});

console.log("RUN: ... bot iniciado com sucesso!");
