import { Context, Telegraf } from "telegraf";
import { transcribeAudio } from "../services/azure";
import workgroups from "../credentials/workgroupsfolders.json";

const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

export function registerTranscreverCommand(bot: Telegraf) {
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

      // Verifica se a mensagem (ou mensagem respondida) contém um áudio
      const msg = ctx.message as any;
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

      console.log("[transcrever] Obtendo link do áudio...");
      const fileLink = await ctx.telegram.getFileLink(voice.file_id);

      console.log("[transcrever] Chamando transcribeAudio...");
      const transcription = await transcribeAudio(fileLink.toString());
      console.log("[transcrever] Transcrição obtida.");

      await ctx.reply(`Transcrição:\n${transcription}`);
      console.log("[transcrever] Comando /transcrever concluído com sucesso.");
    } catch (error) {
      await ctx.reply("Ocorreu um erro ao transcrever o áudio.");
    }
  });
}

export const transcreverCommand = {
  register: registerTranscreverCommand,
  name: () => "/transcrever",
  help: () =>
    "Responda a uma mensagem de voz com o comando `/transcrever` para obter a transcrição do áudio.",
  description: () => "🔊 Transcrever áudio usando o Whisper.",
};
