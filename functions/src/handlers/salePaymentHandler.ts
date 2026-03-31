import { Telegraf, Markup } from "telegraf";
import { admin } from "../config/firebaseInit";
import workgroups from "../credentials/workgroupsfolders.json";
import { escapeMarkdownSafe } from "../utils/utils";

// Map para armazenar timeouts de debounce
const debounceTimeouts = new Map<string, NodeJS.Timeout>();
const pendingNotifications = new Map<string, any[]>();

export async function handleSalePaymentConfirmed(
  event: any,
  bot: Telegraf
) {
  const financeiroGroup = workgroups.find(
    (group: any) => group.label === "Financeiro"
  );
  
  if (!financeiroGroup) {
    console.error("Grupo Financeiro não encontrado");
    return;
  }

  const saleId = event.params.saleId;
  const paidAt = event.data.val();
  
  if (!paidAt) return; // Ignora se paidAt for null/undefined

  try {
    // Busca dados completos da venda
    const saleSnapshot = await admin.database()
      .ref(`/resources/sales/${saleId}`)
      .once('value');
    
    const saleData = saleSnapshot.val();
    
    if (!saleData) {
      console.error(`Dados da venda ${saleId} não encontrados`);
      return;
    }

    // Adiciona à lista de notificações pendentes
    const groupKey = financeiroGroup.value;
    if (!pendingNotifications.has(groupKey)) {
      pendingNotifications.set(groupKey, []);
    }
    
    pendingNotifications.get(groupKey)!.push({
      saleId,
      saleData,
      paidAt
    });

    // Cancela timeout anterior se existir
    if (debounceTimeouts.has(groupKey)) {
      clearTimeout(debounceTimeouts.get(groupKey)!);
    }

    // Cria novo timeout de 2 segundos (mais rápido para melhor UX)
    const timeout = setTimeout(async () => {
      await sendBatchedNotifications(bot, groupKey);
      debounceTimeouts.delete(groupKey);
    }, 2000);

    debounceTimeouts.set(groupKey, timeout);

    console.log(`Pagamento adicionado ao batch: ${saleId}`);
  } catch (error) {
    console.error('Erro ao processar pagamento confirmado:', error);
  }
}

async function sendBatchedNotifications(bot: Telegraf, groupChatId: string) {
  const notifications = pendingNotifications.get(groupChatId) || [];
  if (notifications.length === 0) return;

  try {
    if (notifications.length === 1) {
      // Notificação individual
      const { saleId, saleData, paidAt } = notifications[0];
      await sendSingleNotification(bot, groupChatId, saleId, saleData, paidAt);
    } else {
      // Notificação em lote
      await sendBatchNotification(bot, groupChatId, notifications);
    }
  } catch (error) {
    console.error('Erro ao enviar notificações em lote:', error);
  } finally {
    // Limpa as notificações pendentes
    pendingNotifications.delete(groupChatId);
  }
}

async function sendSingleNotification(
  bot: Telegraf, 
  groupChatId: string, 
  saleId: string, 
  saleData: any, 
  paidAt: string
) {
  const message = `💰 *Pagamento Confirmado*\n\n` +
    `📦 *Produto:* ${escapeMarkdownSafe(saleData.productName || 'Produto não identificado')}\n` +
    `💵 *Valor:* R$ ${(saleData.totalValue || 0).toFixed(2)}\n` +
    `👤 *Cliente:* ${escapeMarkdownSafe(saleData.userName || 'Cliente não identificado')}\n` +
    `📅 *Pago em:* ${new Date(paidAt).toLocaleString('pt-BR')}\n` +
    `🆔 *ID:* \`${saleId}\``;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Confirmar', `saleC_${saleId}`),
      Markup.button.callback('❌ Rejeitar', `saleR_${saleId}`)
    ]
  ]);

  await bot.telegram.sendMessage(groupChatId, message, {
    parse_mode: 'Markdown',
    ...keyboard
  });

  console.log(`Notificação individual enviada: ${saleId}`);
}

async function sendBatchNotification(
  bot: Telegraf, 
  groupChatId: string, 
  notifications: any[]
) {
  const totalValue = notifications.reduce((sum, notif) => {
    const value = notif.saleData.totalValue || 0;
    return sum + value;
  }, 0);

  let message = `💰 *${notifications.length} Pagamentos Confirmados* (R$ ${totalValue.toFixed(2)})\n\n`;
  
  notifications.forEach(({ saleId, saleData }, index) => {
    const product = escapeMarkdownSafe(saleData.productName || 'Produto não identificado');
    const value = saleData.totalValue || 0;
    const userName = escapeMarkdownSafe(saleData.userName || 'Cliente não identificado');
    message += `${index + 1}. ${product} - ${userName} - R$ ${value.toFixed(2)} (\`${saleId}\`)\n`;
  });

  message += `\n📅 *Processado em:* ${new Date().toLocaleString('pt-BR')}`;

  // Cria botões para cada venda
  const buttons = [];
  for (let i = 0; i < notifications.length; i += 2) {
    const row = [];
    
    // Primeiro item da linha
    const notif1 = notifications[i];
    row.push(Markup.button.callback(
      `✅ ${i + 1}`, 
      `saleC_${notif1.saleId}`
    ));
    row.push(Markup.button.callback(
      `❌ ${i + 1}`, 
      `saleR_${notif1.saleId}`
    ));
    
    // Segundo item da linha (se existir)
    if (i + 1 < notifications.length) {
      const notif2 = notifications[i + 1];
      row.push(Markup.button.callback(
        `✅ ${i + 2}`, 
        `saleC_${notif2.saleId}`
      ));
      row.push(Markup.button.callback(
        `❌ ${i + 2}`, 
        `saleR_${notif2.saleId}`
      ));
    }
    
    buttons.push(row);
  }

  const keyboard = Markup.inlineKeyboard(buttons);

  await bot.telegram.sendMessage(groupChatId, message, {
    parse_mode: 'Markdown',
    ...keyboard
  });

  console.log(`Notificação em lote enviada: ${notifications.length} pagamentos`);
}