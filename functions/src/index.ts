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
import { registerQuemSouEuCommand } from "./commands/quemsoueu";
import { registerPautaCommand } from "./commands/pauta";
import { registerInformeCommand } from "./commands/informe";
import { registerDemandaCommand } from "./commands/demanda";
import { registerEncaminhamentoCommand } from "./commands/encaminhamentos";

import { registerConfirmPaymentHandler } from "./callbacks/confirmPaymentCallback";
import { registerCancelPaymentHandler } from "./callbacks/cancelPaymentCallback";
import { registerCalendarHandler } from "./callbacks/confirmEventParticipationCallback";
import { registerPedidoDeInformacaoCommand } from "./commands/pedido_de_informacao";
import { registerDocumentoCommand } from "./commands/documento";
import { registerPlanilhaCommand } from "./commands/planilha";
import { registerFormularioCommand } from "./commands/formulario";
import { apresentacaoCommand } from "./commands/apresentacao";
import { registerEventoCommand } from "./commands/evento";
import { registerPagamentoCommand } from "./commands/pagamento";
import { registerRegistrarPlanilhaCommand } from "./commands/registrar_planilha";
import { checkGoogleForms } from "./scheduler/checkForms";
import { onSchedule } from "firebase-functions/scheduler";
import { clippingCommand } from "./commands/clipping";

export const commandsList = [apresentacaoCommand, clippingCommand];

commandsList.forEach((cmd) => {
  cmd.register(bot);
});

const telegramCommands = commandsList.map((cmd) => ({
  command: cmd.name().replace("/", ""), // sem a barra, se necessário
  description: cmd.description(),
}));
bot.telegram.setMyCommands(telegramCommands);

// Registro dos comandos
registerDemandaCommand(bot);
registerDocumentoCommand(bot);
registerEncaminhamentoCommand(bot);
registerEventoCommand(bot);
registerFormularioCommand(bot);
registerHelpCommand(bot);
registerInformeCommand(bot);
registerPautaCommand(bot);
registerQuemSouEuCommand(bot);
registerPagamentoCommand(bot);
registerPedidoDeInformacaoCommand(bot);
registerPlanilhaCommand(bot);
registerRegistrarPlanilhaCommand(bot);
registerCancelPaymentHandler(bot);
registerConfirmPaymentHandler(bot);
registerCalendarHandler(bot);

registerAjudaCommand(bot);
registerIniciarCommand(bot);
registerStartCommand(bot);

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
