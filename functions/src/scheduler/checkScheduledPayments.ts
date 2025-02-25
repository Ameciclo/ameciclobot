// src/scheduler/checkScheduledPayments.ts
import { onSchedule } from "firebase-functions/scheduler";
import { admin } from "../config/firebaseInit";
import { Telegraf } from "telegraf";
import { PaymentRequest } from "../config/types";
import { getFinancesGroupId } from "../services/firebase";

export const checkScheduledPayments = async (bot: Telegraf) => {
  console.log("Iniciando verificação de agendamentos bancários...");
  try {
    // Obtém todas as solicitações (requests) do Firebase
    const snapshot = await admin.database().ref("requests").once("value");
    const requestsData = snapshot.val();
    if (!requestsData) {
      console.log("Nenhuma solicitação encontrada.");
      return;
    }
    
    const scheduledPayments: PaymentRequest[] = [];
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);
    
    // Filtra os requests conforme critérios
    Object.values(requestsData).forEach((req: any) => {
      if (req.transactionType === "Agendar pagamento" && req.status === "confirmed") {
        const paymentDate = new Date(req.paymentDate);
        if (paymentDate >= tomorrow && paymentDate <= threeDaysLater) {
          scheduledPayments.push(req as PaymentRequest);
        }
      }
    });
    
    if (scheduledPayments.length > 0) {
      let message = "📢 *Agendamentos Bancários para os próximos 3 dias:*\n\n";
      scheduledPayments.forEach((payment, index) => {
        message += `*${index + 1}.* Data: ${payment.paymentDate}\nValor: ${payment.value || "N/A"}\n\n`;
      });
      // Obtém o ID do grupo financeiro
      const groupChatId = await getFinancesGroupId();
      await bot.telegram.sendMessage(groupChatId, message, { parse_mode: "Markdown" });
      console.log("Notificação de agendamentos enviada.");
    } else {
      console.log("Nenhum agendamento encontrado para os próximos 3 dias.");
    }
  } catch (error) {
    console.error("Erro ao verificar agendamentos bancários:", error);
  }
};
