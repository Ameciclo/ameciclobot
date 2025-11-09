import { Telegraf } from "telegraf";
import { verificarPedidosInformacao } from "../services/pedidosInformacao";
import { getAllInformationRequests, getInformationRequestByProtocol, getInformationRequestKey, updateInformationRequest, updateRequestStatus } from "../services/firebase";

async function verificarEAtualizarPedido(protocolo: string, senha: string, bot: Telegraf, requestKey: string, pedidoAnterior: any) {
  console.log(`[DEBUG] Verificando protocolo ${protocolo}`);
  
  const pedidos = await verificarPedidosInformacao([{ protocolo, senha }]);
  const pedido = pedidos[0];
  
  if (!pedido || 'error' in pedido) {
    console.log(`[DEBUG] Erro no scraping para ${protocolo}:`, pedido?.error || 'Erro desconhecido');
    return { error: pedido?.error || 'Erro desconhecido' };
  }
  
  console.log(`[DEBUG] Dados extraídos para ${protocolo}:`, {
    protocolo: pedido.protocolo,
    recurso: pedido.recurso,
    dataPedido: pedido.dataPedido,
    motivo: pedido.motivo,
    totalRespostas: pedido.historicoRespostas?.length || 0,
    ultimaSituacao: pedido.historicoRespostas?.[pedido.historicoRespostas.length - 1]?.situacao
  });
  
  const totalRespostas = pedido.historicoRespostas?.length || 0;
  const houveMudanca = !pedidoAnterior?.verificado || 
    pedidoAnterior.totalRespostas !== totalRespostas ||
    JSON.stringify(pedidoAnterior.ultimaResposta) !== JSON.stringify(pedido.historicoRespostas[pedido.historicoRespostas.length - 1]);
  
  await updateInformationRequest(requestKey, pedido);
  
  // Verificar se há resposta final (status "Respondido")
  const temRespostaFinal = pedido.historicoRespostas.some((resp: any) => 
    resp.situacao.toLowerCase().includes('respondido')
  );
  
  // Se houve resposta final e ainda não foi notificado
  if (temRespostaFinal && pedidoAnterior?.status === 'aguardando_resposta' && !pedidoAnterior?.notificado) {
    await notificarResposta(bot, pedidoAnterior, pedido, requestKey);
    await updateRequestStatus(requestKey, 'respondido', true);
    return { success: true, houveMudanca: true, novaResposta: true };
  }
  
  // Se já tem resposta final e foi aceito, não precisa mais verificar
  if (temRespostaFinal && pedidoAnterior?.status === 'aceito') {
    return { success: true, houveMudanca: false, novaResposta: false, skipFutureChecks: true };
  }
  
  return { success: true, houveMudanca, novaResposta: false };
}

async function notificarResposta(bot: Telegraf, pedidoAnterior: any, pedido: any, requestKey: string) {
  // Buscar a resposta final (status "Respondido")
  const respostaFinal = pedido.historicoRespostas.find((resp: any) => 
    resp.situacao.toLowerCase().includes('respondido')
  );
  
  if (!respostaFinal) return;
  
  const userId = pedidoAnterior.from.id;
  
  let message = `🔔 **Resposta ao seu Pedido de Informação**\n\n`;
  message += `📋 **Protocolo:** ${pedido.protocolo}\n`;
  message += `📊 **Situação:** ${respostaFinal.situacao}\n`;
  message += `📅 **Data:** ${respostaFinal.data}\n\n`;
  
  if (respostaFinal.resposta) {
    const resposta = respostaFinal.resposta.substring(0, 800);
    message += `💬 **Resposta:** ${resposta}${respostaFinal.resposta.length > 800 ? '...' : ''}\n\n`;
  }
  
  // Mostrar links se houver
  if (respostaFinal.links && respostaFinal.links.length > 0) {
    message += `📎 **Arquivos anexos:**\n`;
    respostaFinal.links.forEach((link: any, i: number) => {
      if (link.type === 'baixar' || link.type === 'outro') {
        message += `• [${link.title}](${link.url})\n`;
      }
    });
    message += `\n`;
  }
  
  // Verificar se ainda pode recorrer
  const podeRecorrer = !pedido.mensagemFinal.includes('não é possível interpor recurso');
  
  if (podeRecorrer) {
    message += `❓ **Você aceita esta resposta?**`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Aceitar', callback_data: `accept_response_${requestKey}` },
          { text: '📝 Recorrer', callback_data: `appeal_response_${requestKey}` }
        ]
      ]
    };
    
    try {
      await bot.telegram.sendMessage(userId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Erro ao notificar usuário:', error);
    }
  } else {
    message += `⚠️ **Prazo para recurso expirado**\n${pedido.mensagemFinal}`;
    
    try {
      await bot.telegram.sendMessage(userId, message, { 
        parse_mode: 'Markdown'
      });
      // Marcar como aceito automaticamente se não pode recorrer
      await updateRequestStatus(requestKey, 'aceito', true);
    } catch (error) {
      console.error('Erro ao notificar usuário:', error);
    }
  }
}

export const verificarProtocoloEspecifico = async (protocolo: string, bot: Telegraf) => {
  try {
    const request = await getInformationRequestByProtocol(protocolo);
    if (!request) {
      return { error: 'Protocolo não encontrado no Firebase' };
    }
    
    const requestKey = await getInformationRequestKey(protocolo);
    if (!requestKey) {
      return { error: 'Chave do pedido não encontrada' };
    }
    
    const resultado = await verificarEAtualizarPedido(protocolo, request.password, bot, requestKey, request);
    
    // Se a verificação foi bem-sucedida, buscar a última atualização
    if (resultado.success) {
      const { getInformationRequestData } = require('../services/firebase');
      const dadosAtualizados = await getInformationRequestData(requestKey);
      
      if (dadosAtualizados && dadosAtualizados.historicoRespostas && dadosAtualizados.historicoRespostas.length > 0) {
        const ultimaResposta = dadosAtualizados.historicoRespostas[dadosAtualizados.historicoRespostas.length - 1];
        return { ...resultado, ultimaAtualizacao: ultimaResposta };
      }
    }
    
    return resultado;
  } catch (error: any) {
    return { error: error.message };
  }
};

export const checkPedidosInformacao = async (bot: Telegraf, privateChatId?: number) => {
  const startTime = new Date().toISOString();
  console.log(`[${startTime}] Iniciando verificação de pedidos de informação...`);
  
  try {
    const requests = await getAllInformationRequests();
    console.log(`[${startTime}] Encontradas ${Object.keys(requests).length} credenciais`);
    
    if (Object.keys(requests).length === 0) {
      console.log(`[${startTime}] Nenhuma credencial encontrada no Firebase`);
      return;
    }
    
    let verificados = 0;
    let atualizados = 0;
    let novasRespostas = 0;
    
    for (const [requestKey, request] of Object.entries(requests)) {
      const req = request as any;
      
      // Só verifica pedidos que ainda estão aguardando resposta ou em recorrência
      if (req.status === 'aceito') {
        console.log(`[${startTime}] Pulando protocolo ${req.protocol} - já aceito`);
        continue;
      }
      
      console.log(`[${startTime}] Verificando protocolo ${req.protocol} (status: ${req.status || 'aguardando_resposta'})`);
      const resultado = await verificarEAtualizarPedido(req.protocol, req.password, bot, requestKey, req);
      
      verificados++;
      if (resultado.success && resultado.houveMudanca) {
        atualizados++;
        console.log(`[${startTime}] Pedido ${req.protocol} atualizado`);
      }
      if (resultado.novaResposta) {
        novasRespostas++;
      }
    }
    
    const endTime = new Date().toISOString();
    console.log(`[${endTime}] Verificação concluída: ${verificados} pedidos verificados, ${atualizados} atualizados, ${novasRespostas} novas respostas`);
    
    if (privateChatId) {
      const message = `📋 **Verificação de Pedidos de Informação:**\n\n` +
        `✅ ${verificados} pedidos verificados\n` +
        `🔄 ${atualizados} atualizados\n` +
        `🔔 ${novasRespostas} novas respostas`;
      await bot.telegram.sendMessage(privateChatId, message, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error(`[${startTime}] Erro ao verificar pedidos de informação:`, error);
  }
};