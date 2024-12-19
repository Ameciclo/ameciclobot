import * as admin from "firebase-admin";
import { bot } from "./config/bot";
import { onRequest } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/database";
import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";
import { registerQuemSouEuCommand } from "./commands/quemsoueu";
import { registerStartCommand } from "./commands/start";
import { registerHelpCommand } from "./commands/help";
import { getCoordinatorsId, getFinancesGroupId } from "./services/firebase";
import { registerCancelPaymentHandler } from "./handlers/cancelPaymentHandler";

// Inicializa o Firebase Admin SDK
admin.initializeApp();

// Registro dos comandos
registerStartCommand(bot);
registerHelpCommand(bot);
registerQuemSouEuCommand(bot);

registerCancelPaymentHandler(bot);

// Função disparada ao criar um novo request no Realtime Database
export const sendPaymentRequest = onValueCreated(
  "/requests/{requestId}",
  async (event) => {
    const coordinators = await getCoordinatorsId();
    const groupChatId = await getFinancesGroupId();
    const snapshot = event.data;
    const params = { requestId: event.params.requestId };

    return sendPaymentRequestHandler(
      snapshot,
      params,
      bot,
      groupChatId,
      coordinators
    );
  }
);


// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(async (req, res) => {
  bot.handleUpdate(req.body, res);
});

console.log("RUN: ... bot iniciado com sucesso!");
