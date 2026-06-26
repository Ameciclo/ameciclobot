import { Telegraf } from "telegraf";
import { admin } from "../config/firebaseInit";
import { escapeMarkdownV2 } from "../utils/utils";
import workgroups from "../credentials/workgroupsfolders.json";

interface DemandaData {
  demandados: string[];
  dataLimite: string;
  textoOriginal: string;
  demanda: string;
  workgroup: string;
  solicitante: string;
  dataRegistro: string;
  status: string;
}

// Função para criar mensagem de demandas pendentes
function buildPendingDemandsMessage(demandas: { [key: string]: DemandaData }, workgroupName: string): string {
  const pendingDemands = Object.entries(demandas).filter(([_, data]) => data.status === "pendente");
  
  if (pendingDemands.length === 0) {
    return `📋 *DEMANDAS PENDENTES \\- ${escapeMarkdownV2(workgroupName.toUpperCase())}*\n\n🎉 *Parabéns\\! Não há demandas pendentes\\.*`;
  }

  let message = `📋 *DEMANDAS PENDENTES \\- ${escapeMarkdownV2(workgroupName.toUpperCase())}*\n\n`;
  
  pendingDemands.forEach(([id, data], index) => {
    const demandadosText = data.demandados.length > 0 
      ? data.demandados.join(", ")
      : "Não especificado";
    
    message += `*${index + 1}\\. ID: ${escapeMarkdownV2(id)}*\n`;
    message += `👤 *Solicitante:* ${escapeMarkdownV2(data.solicitante)}\n`;
    message += `👥 *Demandados:* ${escapeMarkdownV2(demandadosText)}\n`;
    message += `📅 *Prazo:* ${escapeMarkdownV2(data.dataLimite)}\n`;
    message += `📝 *Demanda:* ${escapeMarkdownV2(data.demanda)}\n\n`;
  });

  message += `🔄 *Atualizado diariamente às 6h*`;
  
  return message;
}

// Função para criar teclado inline com botões das demandas
function buildDemandsKeyboard(demandas: { [key: string]: DemandaData }) {
  const pendingDemands = Object.entries(demandas).filter(([_, data]) => data.status === "pendente");
  
  if (pendingDemands.length === 0) {
    return { inline_keyboard: [] };
  }

  // Cria botões em colunas (máximo 3 por linha)
  const buttons = pendingDemands.map(([id, _]) => ({
    text: `✅ ${id}`,
    callback_data: `resolve_demanda_${id}`
  }));

  // Organiza em linhas de até 3 botões
  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 3) {
    keyboard.push(buttons.slice(i, i + 3));
  }

  return { inline_keyboard: keyboard };
}

// Função principal para atualizar mensagens fixadas
export const updatePinnedDemands = async (bot: Telegraf) => {
  console.log("[update-pinned-demands] Iniciando atualização de demandas fixadas...");
  
  try {
    // Busca todas as demandas do Firebase
    const demandasSnapshot = await admin.database().ref('demandas').once('value');
    const allDemandas = demandasSnapshot.val() || {};
    
    console.log(`[update-pinned-demands] Encontradas ${Object.keys(allDemandas).length} demandas no total`);

    // Agrupa demandas por workgroup
    const demandsByWorkgroup: { [workgroup: string]: { [id: string]: DemandaData } } = {};
    
    Object.entries(allDemandas).forEach(([id, data]: [string, any]) => {
      const workgroup = data.workgroup || "Desconhecido";
      if (!demandsByWorkgroup[workgroup]) {
        demandsByWorkgroup[workgroup] = {};
      }
      demandsByWorkgroup[workgroup][id] = data;
    });

    // Para cada workgroup, atualiza a mensagem fixada
    for (const [workgroupName, demandas] of Object.entries(demandsByWorkgroup)) {
      const workgroupConfig = workgroups.find((wg: any) => wg.label.toLowerCase() === workgroupName.toLowerCase());
      
      if (!workgroupConfig) {
        console.log(`[update-pinned-demands] Workgroup ${workgroupName} não encontrado na configuração`);
        continue;
      }

      const chatId = workgroupConfig.value;
      console.log(`[update-pinned-demands] Processando workgroup ${workgroupName} (${chatId})`);

      try {
        // Busca mensagem fixada anterior no Firebase
        const pinnedMessageRef = admin.database().ref(`pinned_demands/${chatId}`);
        const pinnedSnapshot = await pinnedMessageRef.once('value');
        const pinnedData = pinnedSnapshot.val();

        // Remove mensagem anterior se existir
        if (pinnedData && pinnedData.messageId) {
          try {
            await bot.telegram.unpinChatMessage(chatId, pinnedData.messageId);
            await bot.telegram.deleteMessage(chatId, pinnedData.messageId);
            console.log(`[update-pinned-demands] Mensagem anterior removida do ${workgroupName}`);
          } catch (error) {
            console.log(`[update-pinned-demands] Erro ao remover mensagem anterior: ${error}`);
          }
        }

        // Cria nova mensagem
        const message = buildPendingDemandsMessage(demandas, workgroupName);
        const keyboard = buildDemandsKeyboard(demandas);

        const sentMessage = await bot.telegram.sendMessage(chatId, message, {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        });

        // Fixa a nova mensagem
        await bot.telegram.pinChatMessage(chatId, sentMessage.message_id, {
          disable_notification: true
        });

        // Salva referência da nova mensagem no Firebase
        await pinnedMessageRef.set({
          messageId: sentMessage.message_id,
          updatedAt: admin.database.ServerValue.TIMESTAMP
        });

        console.log(`[update-pinned-demands] Nova mensagem fixada no ${workgroupName}`);

      } catch (error) {
        console.error(`[update-pinned-demands] Erro ao processar ${workgroupName}:`, error);
      }
    }

    console.log("[update-pinned-demands] Atualização concluída");

  } catch (error) {
    console.error("[update-pinned-demands] Erro geral:", error);
  }
};
