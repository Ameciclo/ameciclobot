import { Markup, Telegraf } from "telegraf";
import { AmecicloUser, PaymentRequest } from "../config/types";
import {
  updatePaymentRequestGroupMessage,
  updatePaymentRequestCoordinatorMessages,
  getWorkgroupId,
} from "../services/firebase";
import { excerptFromRequest } from "../utils/utils";

function buildCoordinatorButtons(
  coordinators: AmecicloUser[],
  requestId: string
) {
  return coordinators.map((coordinator) => {
    const buttonText = `${coordinator.telegram_user.first_name}`;
    const callbackData = `confirm_${coordinator.telegram_user.id}_${requestId}`;
    return Markup.button.callback(buttonText, callbackData);
  });
}

async function createPaymentConfirmationButtons(
  coordinators: AmecicloUser[],
  request: PaymentRequest
) {
  const coordinatorButtonsRows = buildCoordinatorButtons(
    coordinators,
    request.id
  );

  const viewSpreadsheetButton = Markup.button.url(
    "📊 Ver planilha",
    `https://docs.google.com/spreadsheets/d/${request.project.spreadsheet_id}`
  );

  const cancelButton = Markup.button.callback(
    "❌ CANCELAR",
    `cancel_payment_${request.id}`
  );

  return Markup.inlineKeyboard([
    coordinatorButtonsRows,
    [viewSpreadsheetButton, cancelButton],
  ]);
}
export async function sendPaymentRequestHandler(
  bot: Telegraf,
  request: PaymentRequest,
  groupChatId: string,
  coordinators: AmecicloUser[]
) {
  console.log("SOLICITAÇÃO DE PAGAMENTO CRIADA: ", request.transactionType);

  // Monta o texto que será enviado
  const messageToGroup = excerptFromRequest(
    request,
    `💰💰💰 ${request.transactionType.toUpperCase()} 💰💰💰`
  );
  console.log("Grupo financeiro:", groupChatId);
  console.log("Coordenadores:", coordinators);

  try {
    const confirmationMarkup = await createPaymentConfirmationButtons(
      coordinators,
      request
    );

    const result = await bot.telegram.sendMessage(
      groupChatId,
      messageToGroup,
      {
        ...confirmationMarkup,
        parse_mode: 'MarkdownV2'
      }
    );

    await updatePaymentRequestGroupMessage(request, result.message_id);

    // Objeto para armazenar os IDs das mensagens enviadas aos coordenadores
    const coordinatorMessages: Record<number, number> = {};

    for (const coordinator of coordinators) {
      try {
        // Mensagem simplificada conforme solicitado: tipo de transação, valor, projeto
        const simplifiedMessage = `💰${request.transactionType}\n💵${request.value}\n🗂${request.project.name}`;
        
        // Cria o botão de confirmação para o coordenador
        const confirmButton = Markup.button.callback(
          "✅ Assinar",
          `confirm_${coordinator.telegram_user.id}_${request.id}`
        );
        
        const keyboard = Markup.inlineKeyboard([[confirmButton]]);
        
        const sentMessage = await bot.telegram.sendMessage(
          coordinator.telegram_user.id,
          simplifiedMessage,
          keyboard
        );

        // Armazena o ID da mensagem enviada para este coordenador
        coordinatorMessages[coordinator.telegram_user.id] =
          sentMessage.message_id;
      } catch (err) {
        console.error(
          `Erro ao enviar mensagem para coordenação (ID: ${coordinator.telegram_user.id}):`,
          err
        );
      }
    }

    // Armazena os IDs das mensagens no Firebase
    await updatePaymentRequestCoordinatorMessages(
      request.id,
      coordinatorMessages
    );

    // Enviar mensagem para o Grupo de Trabalho associado ao projeto
    try {
      // Assumindo que o nome do grupo de trabalho está no campo "responsible" do projeto
      const workgroupName = request.project.responsible;
      if (workgroupName) {
        const workgroupId = await getWorkgroupId(workgroupName);
        
        if (workgroupId) {
          // Enviar uma versão simplificada da mensagem para o grupo de trabalho
          const workgroupMessage = `💰 ${request.transactionType}\n💵 Valor: ${request.value}\n🗂 Projeto: ${request.project.name}\n📝 Descrição: ${request.description}`;
          
          await bot.telegram.sendMessage(workgroupId, workgroupMessage);
          console.log(`Mensagem enviada para o grupo de trabalho ${workgroupName} (ID: ${workgroupId})`);
        } else {
          console.log(`Grupo de trabalho não encontrado: ${workgroupName}`);
        }
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem para o grupo de trabalho:", err);
      // Não interrompe o fluxo principal se falhar
    }

    return result;
  } catch (err) {
    console.error("Erro ao enviar mensagem para o grupo:", err);
    return err;
  }
}
