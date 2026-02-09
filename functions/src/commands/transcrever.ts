import { Context, Telegraf } from "telegraf";
import { transcribeAudioWithGladia } from "../services/gladia";
import { getTranscriptionSettings, setAutoTranscription, setMaxDuration } from "../services/firebase";
import workgroups from "../credentials/workgroupsfolders.json";

const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

async function processTranscription(ctx: Context, voice: any): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const settings = await getTranscriptionSettings(chatId);
  
  // Verifica limite de duração
  if (voice.duration > settings.max_minutes * 60) {
    await ctx.reply(`⚠️ Áudio muito longo (${Math.round(voice.duration / 60)}min). Limite: ${settings.max_minutes}min`);
    return;
  }

  // Aviso de processamento
  const processingMsg = await ctx.reply("🎯 Processando transcrição... Aguarde alguns minutos.");

  try {
    console.log("[transcrever] Obtendo link do áudio...");
    const fileLink = await ctx.telegram.getFileLink(voice.file_id);

    console.log("[transcrever] Chamando transcribeAudioWithGladia...");
    const transcription = await transcribeAudioWithGladia(fileLink.toString());
    console.log("[transcrever] Transcrição obtida.");

    // Remove mensagem de processamento
    await ctx.telegram.deleteMessage(chatId, processingMsg.message_id);
    
    // Envia transcrição
    await ctx.reply(`📝 **Transcrição:**\n${transcription}`, { parse_mode: 'Markdown' });
    console.log("[transcrever] Transcrição enviada com sucesso.");
  } catch (error) {
    console.error("[transcrever] Erro:", error);
    // Remove mensagem de processamento
    await ctx.telegram.deleteMessage(chatId, processingMsg.message_id);
    await ctx.reply("❌ Ocorreu um erro ao transcrever o áudio.");
  }
}

export function registerTranscreverCommand(bot: Telegraf) {
  // Handler para transcrição automática
  bot.on('voice', async (ctx: Context) => {
    try {
      const chatId = ctx.chat?.id;
      if (!chatId || !ALLOWED_GROUPS.includes(Number(chatId))) {
        return; // Ignora grupos não autorizados
      }

      const settings = await getTranscriptionSettings(chatId);
      if (!settings.auto_enabled) {
        return; // Auto-transcrição desabilitada
      }

      const msg = ctx.message as any;
      const voice = msg.voice;
      if (voice && voice.file_id) {
        console.log("[transcrever] Auto-transcrição ativada para áudio");
        await processTranscription(ctx, voice);
      }
    } catch (error) {
      console.error("[transcrever] Erro na auto-transcrição:", error);
    }
  });

  bot.command("transcrever", async (ctx: Context) => {
    try {
      console.log("[transcrever] Comando iniciado.");
      const chatId = ctx.chat?.id;
      if (!chatId || !ALLOWED_GROUPS.includes(Number(chatId))) {
        console.log("[transcrever] Chat não autorizado.");
        await ctx.reply(
          "Este comando só pode ser usado nos grupos de trabalho da Ameciclo."
        );
        return;
      }

      const msg = ctx.message as any;
      const args = msg.text?.split(' ').slice(1) || [];
      
      // Comandos de configuração
      if (args.length > 0) {
        const command = args[0].toLowerCase();
        
        if (command === 'auto') {
          const success = await setAutoTranscription(chatId, true);
          if (success) {
            await ctx.reply("✅ Auto-transcrição **ativada** para este grupo.", { parse_mode: 'Markdown' });
          } else {
            await ctx.reply("❌ Erro ao ativar auto-transcrição.");
          }
          return;
        }
        
        if (command === 'off' || command === 'desligado') {
          const success = await setAutoTranscription(chatId, false);
          if (success) {
            await ctx.reply("🔕 Auto-transcrição **desativada** para este grupo.", { parse_mode: 'Markdown' });
          } else {
            await ctx.reply("❌ Erro ao desativar auto-transcrição.");
          }
          return;
        }
        
        if (command === 'status') {
          const settings = await getTranscriptionSettings(chatId);
          const status = settings.auto_enabled ? "✅ Ativada" : "🔕 Desativada";
          await ctx.reply(
            `📊 **Status da Transcrição:**\n` +
            `Auto-transcrição: ${status}\n` +
            `Limite máximo: ${settings.max_minutes} minutos`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
        
        // Configurar limite de minutos
        const minutes = parseInt(command);
        if (!isNaN(minutes) && minutes >= 1 && minutes <= 10) {
          const success = await setMaxDuration(chatId, minutes);
          if (success) {
            await ctx.reply(`⏱️ Limite de duração definido para **${minutes} minutos**.`, { parse_mode: 'Markdown' });
          } else {
            await ctx.reply("❌ Erro ao definir limite de duração.");
          }
          return;
        }
        
        // Comando inválido
        await ctx.reply(
          "❓ **Comandos disponíveis:**\n" +
          "`/transcrever` - Transcreve áudio respondido\n" +
          "`/transcrever auto` - Ativa auto-transcrição\n" +
          "`/transcrever off` - Desativa auto-transcrição\n" +
          "`/transcrever [1-10]` - Define limite em minutos\n" +
          "`/transcrever status` - Mostra configuração atual",
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Transcrição manual de áudio respondido
      let voice;
      if (msg.reply_to_message && msg.reply_to_message.voice) {
        voice = msg.reply_to_message.voice;
        console.log("[transcrever] Áudio obtido da mensagem respondida.");
      } else if (msg.voice) {
        voice = msg.voice;
        console.log("[transcrever] Áudio obtido da própria mensagem.");
      }
      
      if (!voice || !voice.file_id) {
        console.log("[transcrever] Nenhum áudio encontrado.");
        await ctx.reply(
          "Por favor, responda a uma mensagem de voz para transcrever."
        );
        return;
      }

      await processTranscription(ctx, voice);
      
    } catch (error) {
      console.error("[transcrever] Erro no comando:", error);
      await ctx.reply("❌ Ocorreu um erro ao processar o comando.");
    }
  });
}

export const transcreverCommand = {
  register: registerTranscreverCommand,
  name: () => "/transcrever",
  help: () =>
    "🔊 **Transcrever áudios:**\n" +
    "`/transcrever` - Transcreve áudio respondido\n" +
    "`/transcrever auto` - Ativa auto-transcrição\n" +
    "`/transcrever off` - Desativa auto-transcrição\n" +
    "`/transcrever [1-10]` - Define limite em minutos\n" +
    "`/transcrever status` - Mostra configuração atual",
  description: () => "🔊 Transcrever áudios com IA (Gladia) e configurações avançadas.",
};
