import { Context, Telegraf } from 'telegraf';
import { getUserData, updateUserEmail } from '../services/firebase';

export function getName() {
  return "/quem_sou_eu";
}

export function getHelp() {
  return "Use o comando `/quem\\_sou\\_eu` para obter informações sobre você no bot\\.\nUse `/quem\\_sou\\_eu email@exemplo.com` para cadastrar seu email\\.";
}

export function getDescription() {
  return "🤔 Descubra suas informações no bot.";
}



function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function register(bot: Telegraf) {
  bot.command('quem_sou_eu', async (ctx: Context) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    
    if (!userId) {
      await ctx.reply('❌ Não foi possível identificar o usuário.');
      return;
    }

    const messageText = (ctx.message as any)?.text;
    const args = messageText?.split(' ').slice(1);
    const emailArg = args?.[0];

    // Se foi fornecido um email, cadastra/atualiza
    if (emailArg) {
      if (!isValidEmail(emailArg)) {
        await ctx.reply('❌ Email inválido. Use o formato: /quem_sou_eu email@exemplo.com');
        return;
      }

      const success = await updateUserEmail(userId, emailArg);
      if (success) {
        await ctx.reply(`✅ Email cadastrado com sucesso: ${emailArg}`);
      } else {
        await ctx.reply('❌ Erro ao cadastrar email. Tente novamente.');
      }
      return;
    }

    // Busca dados do usuário
    const userData = await getUserData(userId);
    
    let message = `👤 **Suas informações:**\n\n`;
    message += `🆔 **User ID:** ${userId}\n`;
    message += `💬 **Chat ID:** ${chatId}\n`;
    message += `👋 **Nome:** ${ctx.from?.first_name || 'N/A'}`;
    
    if (ctx.from?.last_name) {
      message += ` ${ctx.from.last_name}`;
    }
    
    if (ctx.from?.username) {
      message += `\n📱 **Username:** @${ctx.from.username}`;
    }
    
    if (userData?.email) {
      message += `\n📧 **Email:** ${userData.email}`;
    } else {
      message += `\n📧 **Email:** Não cadastrado`;
      message += `\n\n💡 Para cadastrar seu email, use:\n\`/quem_sou_eu seuemail@exemplo.com\``;
    }
    
    if (userData?.role) {
      message += `\n🎭 **Função:** ${userData.role}`;
    }
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  });
}

export const quem_sou_euCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
