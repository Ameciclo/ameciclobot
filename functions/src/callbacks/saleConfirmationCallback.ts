import { Context } from "telegraf";
import { admin } from "../config/firebaseInit";
import { escapeMarkdownSafe } from "../utils/utils";

export async function handleSaleConfirmationCallback(ctx: Context) {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  
  const callbackData = ctx.callbackQuery.data;
  
  let action: string;
  let saleId: string;
  
  if (callbackData.startsWith('saleC_')) {
    action = 'confirm';
    saleId = callbackData.replace('saleC_', '');
  } else if (callbackData.startsWith('saleR_')) {
    action = 'reject';
    saleId = callbackData.replace('saleR_', '');
  } else {
    return;
  }
  
  try {
    let status: string;
    let emoji: string;
    let actionText: string;
    
    if (action === 'confirm') {
      status = 'CONFIRMED';
      emoji = '✅';
      actionText = 'confirmado';
    } else if (action === 'reject') {
      status = 'CANCELLED';
      emoji = '❌';
      actionText = 'rejeitado';
    } else {
      return;
    }
    
    // Determina se é venda ou doação baseado no caminho
    const saleRef = admin.database().ref(`/resources/sales/${saleId}`);
    const donationRef = admin.database().ref(`/resources/donations/${saleId}`);
    
    // Verifica se existe como venda
    const saleSnapshot = await saleRef.once('value');
    let isFound = false;
    
    if (saleSnapshot.exists()) {
      // É uma venda
      await saleRef.child('status').set(status);
      if (status === 'CONFIRMED') {
        await saleRef.child('confirmedAt').set(new Date().toISOString());
      }
      isFound = true;
    } else {
      // Verifica se é doação
      const donationSnapshot = await donationRef.once('value');
      if (donationSnapshot.exists()) {
        await donationRef.child('status').set(status);
        if (status === 'CONFIRMED') {
          await donationRef.child('confirmedAt').set(new Date().toISOString());
        }
        isFound = true;
      }
    }
    
    if (!isFound) {
      await ctx.answerCbQuery('❌ Item não encontrado');
      return;
    }
    
    // Para mensagens em lote, remove apenas os botões do item específico
    const message = ctx.callbackQuery.message;
    if (message && 'text' in message) {
      const originalText = message.text || '';
      
      // Verifica se é uma mensagem em lote (contém "Pagamentos Confirmados")
      if (originalText.includes('Pagamentos Confirmados')) {
        // Reconstrói o keyboard removendo apenas os botões do item atual
        const currentKeyboard = message.reply_markup?.inline_keyboard || [];
        const newKeyboard = currentKeyboard.map(row => 
          row.filter(button => {
            // Verifica se é um callback button e se contém o saleId
            if ('callback_data' in button) {
              return !button.callback_data?.includes(`_${saleId}`);
            }
            return true; // Mantém outros tipos de botão
          })
        ).filter(row => row.length > 0); // Remove linhas vazias
        
        // Adiciona status ao texto sem Markdown para evitar problemas de parsing
        const updatedText = `${originalText}\n\n${emoji} Item ${saleId} ${actionText.toUpperCase()} por ${ctx.from?.first_name || 'Usuário'}`;
        
        await ctx.editMessageText(updatedText, {
          reply_markup: {
            inline_keyboard: newKeyboard
          }
        });
        
        await ctx.answerCbQuery(`${emoji} Item ${actionText} com sucesso!`);
      } else {
        // Para mensagens individuais, edita normalmente removendo todos os botões
        const updatedText = `${originalText}\n\n${emoji} *${actionText.toUpperCase()}* por ${escapeMarkdownSafe(ctx.from?.first_name || 'Usuário')}`;
        
        await ctx.editMessageText(updatedText, {
          parse_mode: 'Markdown'
        });
        
        await ctx.answerCbQuery(`${emoji} Pagamento ${actionText} com sucesso!`);
      }
    }
    
  } catch (error) {
    console.error('Erro ao processar confirmação de venda:', error);
    await ctx.answerCbQuery('❌ Erro ao processar confirmação');
  }
}