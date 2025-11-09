import { Telegraf } from "telegraf";
import { registerEventParticipationCallback } from "./callbacks/confirmEventParticipationCallback";
import { registerConfirmPaymentCallback } from "./callbacks/confirmPaymentCallback";
import { registerCancelPaymentCallback } from "./callbacks/cancelPaymentCallback";
import { registerModeloUseCallback } from "./callbacks/modeloChooserCallback";
import { registerAssignWorkgroupCallback } from "./callbacks/assignWorkgroup";
import { registerFolderChooserCallback } from "./callbacks/folderChooserCallback";
import { registerEventCallback } from "./callbacks/eventCallback";
import { registerReceiptTypeCallback } from "./callbacks/receiptTypeCallback";
import { registerInformationRequestCallback } from "./callbacks/informationRequestCallback";
import { registerPendenciasCallbacks } from "./callbacks/pendenciasCallback";
import { registerNovoArquivoCallback } from "./callbacks/novoArquivoCallback";
import { registerAjudanteFinanceiroCallback } from "./callbacks/ajudanteFinanceiroCallback";

export function registerAllCallbacks(bot: Telegraf) {
  console.log("Registrando callbacks...");
  
  registerModeloUseCallback(bot);
  registerEventParticipationCallback(bot);
  registerCancelPaymentCallback(bot);
  registerConfirmPaymentCallback(bot);
  registerEventCallback(bot);
  registerReceiptTypeCallback(bot);
  registerAssignWorkgroupCallback(bot);
  registerInformationRequestCallback(bot);
  registerFolderChooserCallback(bot);
  registerPendenciasCallbacks(bot);
  registerNovoArquivoCallback(bot);
  registerAjudanteFinanceiroCallback(bot);
  
  console.log("Callbacks registrados");
}