import { Composer, Markup, Scenes, session } from "telegraf";

// you can also pass step handlers as Composer
// and attach any methods you need
const startComposer = new Composer<Scenes.WizardContext>();

const scene = new Scenes.WizardScene<Scenes.WizardContext>( 
  "sceneId",
  async (ctx) => {
    await ctx.reply(
      "Step 1",
      Markup.inlineKeyboard([Markup.button.callback("Go to Step 2", "next")])
    );
  },
  async (ctx) => {
    await ctx.reply(
      "Step 2. Final step, send /done to finish",
      Markup.inlineKeyboard([Markup.button.callback("Finish", "done")])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    await ctx.answerCbQuery();
    console.log("/PAGAMENTO: Done");
    await ctx.reply("Pagamento finalizado com sucesso!");
    return await ctx.scene.leave();
  }
);

// to compose all scenes you use Stage
const stage = new Scenes.Stage<Scenes.WizardContext>([scene]);

startComposer.use(session());
// this attaches ctx.scene to the global context
startComposer.use(stage.middleware());

// you can enter the scene only AFTER registering middlewares
// otherwise ctx.scene will be undefined
startComposer.command("start", (ctx) => ctx.scene.enter("sceneId"));

export default startComposer;
