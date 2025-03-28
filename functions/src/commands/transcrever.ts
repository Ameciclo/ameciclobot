// src/commands/transcrever.ts
import { Context, Telegraf } from "telegraf";
import { transcribeAudio } from "../services/azure";
import workgroups from "../credentials/workgroupsfolders.json";

const ALLOWED_GROUPS = workgroups.map((group: any) => Number(group.value));

export function registerTranscreverCommand(bot: Telegraf) {
  bot.command("transcrever", async (ctx: Context) => {
    try {
      const chatId = ctx.chat?.id;

      if (!chatId || !ALLOWED_GROUPS.includes(Number(chatId))) {
        await ctx.reply(
          "Este comando só pode ser usado nos grupos de trabalho da Ameciclo."
        );
        return;
      }

      // Força o tipo de ctx.message para any para acessar reply_to_message
      const msg = ctx.message as any;
      let voice;
      if (msg.reply_to_message && msg.reply_to_message.voice) {
        voice = msg.reply_to_message.voice;
      } else if (msg.voice) {
        voice = msg.voice;
      }

      if (!voice || !voice.file_id) {
        await ctx.reply(
          "Por favor, responda a uma mensagem de voz para transcrever."
        );
        return;
      }

      const fileLink = await ctx.telegram.getFileLink(voice.file_id);
      console.log("Link do áudio:", fileLink.toString());

      const transcription = await transcribeAudio(fileLink.toString());
      console.log("Transcrição:", transcription);

      await ctx.reply(`Transcrição:\n${transcription}`);
    } catch (error) {
      console.error("Erro ao transcrever áudio:", error);
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
