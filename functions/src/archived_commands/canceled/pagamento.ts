// src/commands/pagamento.ts
import { Context, Telegraf } from "telegraf";

export function register(bot: Telegraf) {
  bot.command("pagamento", async (ctx: Context) => {
    await ctx.reply(
      "O comando /pagamento foi desativado e suas funcionalidades foram transferidas para a Central Ameciclista (vem no privado comigo).",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "⚙️ Central Ameciclista ❤️",
                url: "https://t.me/ameciclobot/ameciclistas",
              },
            ],
          ],
        },
        parse_mode: "HTML",
      }
    );
  });
}

export const pagamentoCommand = {
  register,
  name: undefined,
  help: undefined,
  description: undefined,
};
