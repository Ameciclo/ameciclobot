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

import { quemSouEuCommand } from "./commands/quemsoueu";
import { pautaCommand } from "./commands/pauta";
import { informeCommand } from "./commands/informe";
import { demandaCommand } from "./commands/demanda";
import { encaminhamentoCommand } from "./commands/encaminhamentos";
import { pedidoDeInformacaoCommand } from "./commands/pedido_de_informacao";
import { documentoCommand } from "./commands/documento";
import { planilhaCommand } from "./commands/planilha";
import { formularioCommand } from "./commands/formulario";
import { apresentacaoCommand } from "./commands/apresentacao";
import { eventoCommand } from "./commands/evento";
import { pagamentoCommand } from "./commands/pagamento";
import { registrarPlanilhaCommand } from "./commands/registrar_planilha";
import { clippingCommand } from "./commands/clipping";

import { registerCalendarHandler } from "./callbacks/confirmEventParticipationCallback";
import { registerConfirmPaymentHandler } from "./callbacks/confirmPaymentCallback";
import { registerCancelPaymentHandler } from "./callbacks/cancelPaymentCallback";

import { checkGoogleForms } from "./scheduler/checkForms";
import { onSchedule } from "firebase-functions/scheduler";

export const commandsList = [
  apresentacaoCommand,
  clippingCommand,
  demandaCommand,
];

commandsList.forEach((cmd) => {
  cmd.register(bot);
});

const telegramCommands = commandsList.map((cmd) => ({
  command: cmd.name().replace("/", ""), // sem a barra, se necessário
  description: cmd.description(),
}));
bot.telegram.setMyCommands(telegramCommands);

registerAjudaCommand(bot);
registerHelpCommand(bot);
registerIniciarCommand(bot);
registerStartCommand(bot);

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

// Função HTTP do bot para webhook do Telegram
export const botFunction = onRequest(async (req, res) => {
  console.log(req.body);
  bot.handleUpdate(req.body, res);
});

export const scheduledCheckGoogleForms = onSchedule(
  "every 24 hours",
  async (context) => {
    console.log("RUN: ... scheduledCheckGoogleForms");
    await checkGoogleForms(bot);
  }
);

console.log("RUN: ... bot iniciado com sucesso!");
