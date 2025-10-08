import { Telegraf } from "telegraf";
import { admin } from "../config/firebaseInit";
import { escapeMarkdownV2 } from "../utils/utils";

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

// Função para verificar se uma data é amanhã
function isTomorrow(dateStr: string): boolean {
  try {
    const [day, month, year] = dateStr.split('/').map(Number);
    const targetDate = new Date(year, month - 1, day);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const targetDateNormalized = new Date(targetDate);
    targetDateNormalized.setHours(0, 0, 0, 0);
    
    return targetDateNormalized.getTime() === tomorrow.getTime();
  } catch (error) {
    console.error("Erro ao parsear data:", dateStr, error);
    return false;
  }
}

// Função principal para verificar lembretes de demandas
export const checkDemandReminders = async (bot: Telegraf) => {
  console.log("[demand-reminders] Verificando lembretes de demandas...");
  
  try {
    // Busca todas as demandas pendentes
    const demandasSnapshot = await admin.database().ref('demandas').once('value');
    const allDemandas = demandasSnapshot.val() || {};
    
    const pendingDemands = Object.entries(allDemandas).filter(([_, data]: [string, any]) => 
      data.status === "pendente"
    );
    
    console.log(`[demand-reminders] Encontradas ${pendingDemands.length} demandas pendentes`);

    for (const [demandaId, demandaData] of pendingDemands) {
      const data = demandaData as DemandaData;
      
      // Verifica se o prazo é amanhã
      if (isTomorrow(data.dataLimite)) {
        console.log(`[demand-reminders] Demanda ${demandaId} vence amanhã`);
        
        // Verifica se já foi notificado hoje
        const notifiedSnapshot = await admin.database().ref(`demandas/${demandaId}/reminderSent`).once('value');
        if (notifiedSnapshot.exists()) {
          console.log(`[demand-reminders] Demanda ${demandaId} já foi notificada hoje`);
          continue;
        }
        
        // Envia lembrete para pessoas demandadas
        if (data.demandados && data.demandados.length > 0) {
          for (const mention of data.demandados) {
            try {
              const username = mention.replace('@', '');
              
              const reminderMessage = 
                `⏰ *LEMBRETE: DEMANDA VENCE AMANHÃ!*\n\n` +
                `🆔 *ID:* \`${escapeMarkdownV2(demandaId)}\`\n` +
                `📅 *Prazo:* ${escapeMarkdownV2(data.dataLimite)}\n` +
                `👤 *Solicitante:* ${escapeMarkdownV2(data.solicitante)}\n` +
                `🏢 *Workgroup:* ${escapeMarkdownV2(data.workgroup)}\n\n` +
                `📝 *Demanda:* ${escapeMarkdownV2(data.demanda)}\n\n` +
                `💡 Use \`/demanda ${demandaId}\` para adiar se necessário.`;

              await bot.telegram.sendMessage(
                `@${username}`,
                reminderMessage,
                {
                  parse_mode: "MarkdownV2",
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "✅ Marcar como resolvida",
                          callback_data: `resolve_demanda_${demandaId}`,
                        },
                        {
                          text: "📅 Adiar",
                          callback_data: `postpone_demanda_${demandaId}`,
                        },
                      ],
                    ],
                  },
                }
              );
              
              console.log(`[demand-reminders] Lembrete enviado para ${username}`);
            } catch (error: any) {
              console.log(`[demand-reminders] Não foi possível enviar lembrete para ${mention}:`, error.message);
            }
          }
        }
        
        // Marca como notificado
        await admin.database().ref(`demandas/${demandaId}/reminderSent`).set(
          admin.database.ServerValue.TIMESTAMP
        );
        
        console.log(`[demand-reminders] Demanda ${demandaId} marcada como notificada`);
      }
    }
    
    console.log("[demand-reminders] Verificação de lembretes concluída");
    
  } catch (error) {
    console.error("[demand-reminders] Erro ao verificar lembretes:", error);
  }
};