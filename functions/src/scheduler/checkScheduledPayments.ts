import { Telegraf } from "telegraf";
import { PaymentRequest } from "../config/types";
import { getAllRequests, getFinancesGroupId } from "../services/firebase";

export const checkScheduledPayments = async (bot: Telegraf) => {
  console.log("Iniciando verificação de agendamentos bancários...");
  try {
    // Obtém todas as solicitações (requests) do Firebase
    const requestsData = await getAllRequests();

    const scheduledPayments: PaymentRequest[] = [];
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);

    // Filtra os requests conforme critérios
    Object.values(requestsData).forEach((req: any) => {
      if (
        req.transactionType === "Agendar pagamento" &&
        req.status === "confirmed"
      ) {
        const paymentDate = new Date(req.paymentDate);
        if (paymentDate >= tomorrow && paymentDate <= oneWeekLater) {
          scheduledPayments.push(req as PaymentRequest);
        }
      }
    });

    if (scheduledPayments.length > 0) {
      let message = "📢 *Agendamentos Bancários para os próximos 3 dias:*\n\n";
      scheduledPayments.forEach((payment, index) => {
        message += `*${index + 1}.* 📄 Projeto: ${payment.project.name}\n`;
        message += `    👤 Fornecedor: ${payment.supplier.nickname}\n`;
        message += `    📅 Data: ${payment.paymentDate}\n`;
        message += `    💲 Valor: ${payment.value || "N/A"}\n\n`;
      });
      const groupChatId = await getFinancesGroupId();
      await bot.telegram.sendMessage(groupChatId, message, {
        parse_mode: "Markdown",
      });
      console.log("Notificação de agendamentos enviada.");
    } else {
      console.log("Nenhum agendamento encontrado para os próximos 3 dias.");
    }
  } catch (error) {
    console.error("Erro ao verificar agendamentos bancários:", error);
  }
};
