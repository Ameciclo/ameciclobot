// src/commands/evento.ts
import { Context, Telegraf } from "telegraf";

export function register(bot: Telegraf) {
  bot.command("evento", async (ctx: Context) => {
    await ctx.reply(
      "O comando /evento foi desativado e suas funcionalidades foram transferidas para a Central Ameciclista (vem no privado comigo).",
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

export const eventoCommand = {
  register,
  name: undefined,
  help: undefined,
  description: undefined,
};
