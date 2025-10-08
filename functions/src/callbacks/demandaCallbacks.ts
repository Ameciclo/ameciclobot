import { Context, Telegraf } from "telegraf";
import { admin } from "../config/firebaseInit";
import { escapeMarkdownV2 } from "../utils/utils";

export function registerDemandaCallbacks(bot: Telegraf) {
  // Callback para concordar com demanda
  bot.action(/^agree_demanda_(.+)$/, async (ctx: Context) => {
    try {
      const demandaId = ctx.match![1];
      const userId = ctx.from?.id;
      
      if (!userId) {
        await ctx.answerCbQuery("Erro: usuário não identificado");
        return;
      }

      // Atualiza no Firebase que o usuário concordou
      await admin.database().ref(`demandas/${demandaId}/acordos/${userId}`).set({
        userId,
        userName: `${ctx.from?.first_name} ${ctx.from?.last_name || ""}`.trim(),
        timestamp: admin.database.ServerValue.TIMESTAMP
      });

      await ctx.editMessageText(
        `✅ *Demanda aceita!*\n\nVocê concordou com a demanda \`${escapeMarkdownV2(demandaId)}\`.\n\n💡 Use \`/demanda ${demandaId}\` para gerenciar prazos.`,
        { parse_mode: "MarkdownV2" }
      );

      await ctx.answerCbQuery("✅ Demanda aceita!");

    } catch (error) {
      console.error("[demanda-callback] Erro ao aceitar demanda:", error);
      await ctx.answerCbQuery("Erro ao aceitar demanda");
    }
  });

  // Callback para adiar demanda (menu)
  bot.action(/^postpone_demanda_(.+)$/, async (ctx: Context) => {
    try {
      const demandaId = ctx.match![1];
      
      const message = 
        `⏰ *Adiar Demanda*\n\n` +
        `🆔 *ID:* \`${escapeMarkdownV2(demandaId)}\`\n\n` +
        `📅 *Escolha o período de adiamento:*`;
      
      await ctx.editMessageText(message, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📅 Adiar para amanhã",
                callback_data: `postpone_${demandaId}_1`,
              },
              {
                text: "📅 Depois de amanhã",
                callback_data: `postpone_${demandaId}_2`,
              },
            ],
            [
              {
                text: "📅 Uma semana",
                callback_data: `postpone_${demandaId}_7`,
              },
              {
                text: "📅 Um mês",
                callback_data: `postpone_${demandaId}_30`,
              },
            ],
          ],
        },
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error("[demanda-callback] Erro ao mostrar opções de adiamento:", error);
      await ctx.answerCbQuery("Erro ao carregar opções");
    }
  });

  // Callback para adiar demanda (execução)
  bot.action(/^postpone_(.+)_(\d+)$/, async (ctx: Context) => {
    try {
      const demandaId = ctx.match![1];
      const days = parseInt(ctx.match![2]);
      const userId = ctx.from?.id;
      
      if (!userId) {
        await ctx.answerCbQuery("Erro: usuário não identificado");
        return;
      }

      // Busca a demanda
      const demandaSnapshot = await admin.database().ref(`demandas/${demandaId}`).once('value');
      const demandaData = demandaSnapshot.val();

      if (!demandaData) {
        await ctx.answerCbQuery("Demanda não encontrada");
        return;
      }

      // Calcula nova data
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      const day = String(newDate.getDate()).padStart(2, '0');
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const year = newDate.getFullYear();
      const newDateStr = `${day}/${month}/${year}`;

      // Atualiza no Firebase
      await admin.database().ref(`demandas/${demandaId}`).update({
        dataLimite: newDateStr,
        adiamentos: admin.database.ServerValue.increment(1),
        ultimoAdiamento: {
          userId,
          userName: `${ctx.from?.first_name} ${ctx.from?.last_name || ""}`.trim(),
          diasAdiados: days,
          timestamp: admin.database.ServerValue.TIMESTAMP
        }
      });

      const dayText = days === 1 ? "amanhã" : days === 2 ? "depois de amanhã" : days === 7 ? "uma semana" : "um mês";
      
      await ctx.editMessageText(
        `📅 *Demanda adiada!*\n\n` +
        `🆔 *ID:* \`${escapeMarkdownV2(demandaId)}\`\n` +
        `📅 *Novo prazo:* ${escapeMarkdownV2(newDateStr)}\n` +
        `⏰ *Adiada para:* ${escapeMarkdownV2(dayText)}`,
        { parse_mode: "MarkdownV2" }
      );

      await ctx.answerCbQuery(`✅ Adiada para ${dayText}!`);

    } catch (error) {
      console.error("[demanda-callback] Erro ao adiar demanda:", error);
      await ctx.answerCbQuery("Erro ao adiar demanda");
    }
  });

  // Callback para resolver demanda
  bot.action(/^resolve_demanda_(.+)$/, async (ctx: Context) => {
    try {
      const demandaId = ctx.match![1];
      const userId = ctx.from?.id;
      
      if (!userId) {
        await ctx.answerCbQuery("Erro: usuário não identificado");
        return;
      }

      console.log(`[demanda-callback] Resolvendo demanda ${demandaId} por usuário ${userId}`);

      // Busca a demanda no Firebase
      const demandaSnapshot = await admin.database().ref(`demandas/${demandaId}`).once('value');
      const demandaData = demandaSnapshot.val();

      if (!demandaData) {
        await ctx.answerCbQuery("Demanda não encontrada");
        return;
      }

      if (demandaData.status === "resolvida") {
        await ctx.answerCbQuery("Esta demanda já foi resolvida");
        return;
      }

      // Atualiza status no Firebase
      await admin.database().ref(`demandas/${demandaId}`).update({
        status: "resolvida",
        resolvidoPor: userId,
        resolvidoEm: admin.database.ServerValue.TIMESTAMP
      });

      // Busca informações do usuário que resolveu
      const userInfo = ctx.from;
      const resolvedBy = `${userInfo?.first_name} ${userInfo?.last_name || ""}`.trim();

      // Atualiza a mensagem
      const updatedMessage = 
        `✅ *Demanda resolvida!*\n\n` +
        `🆔 *ID:* \`${escapeMarkdownV2(demandaId)}\`\n` +
        `👤 *Resolvida por:* ${escapeMarkdownV2(resolvedBy)}\n` +
        `📝 *Demanda:* ${escapeMarkdownV2(demandaData.demanda)}\n\n` +
        `🎉 *Obrigado por resolver esta demanda!*`;

      await ctx.editMessageText(updatedMessage, {
        parse_mode: "MarkdownV2"
      });

      await ctx.answerCbQuery("✅ Demanda marcada como resolvida!");

      console.log(`[demanda-callback] Demanda ${demandaId} resolvida com sucesso`);

    } catch (error) {
      console.error("[demanda-callback] Erro ao resolver demanda:", error);
      await ctx.answerCbQuery("Erro ao resolver demanda");
    }
  });
}