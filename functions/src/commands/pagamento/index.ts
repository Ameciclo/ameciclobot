import { Composer, Scenes } from "telegraf";
import { displayProjects, handleProjectSelection, project } from "./steps/project";
import { MyContext } from "../../types";
import { budget } from "./steps/budget";
//import { suplier } from "./steps/suplier";
//import { value } from "./steps/value";
//import { description as stepDescription } from "./steps/description";

// export const name = "evento";
// export const description = `🗂 Adicionar pagamento`;
// export const help = `🗂 Ajuda do pagamento`;

const paymentComposer = new Composer<MyContext>();

export const scene = new Scenes.WizardScene<MyContext>(
  "pagamento",
  displayProjects,
  handleProjectSelection,
  ...budget,
  // suplier,
  // value,
  // stepDescription
  async (ctx) => {
    console.log("/PAGAMENTO: Done");
    await ctx.reply("Pagamento finalizado com sucesso!");
    return await ctx.scene.leave();
  }
);

const stage = new Scenes.Stage<MyContext>([scene]);

paymentComposer.use((ctx, next) => {
  ctx.session = ctx.session || {};
  ctx.session.pagamento = ctx.session.pagamento || {};
  return next();
});

paymentComposer.use(stage.middleware());

paymentComposer.command("pagamento", (ctx) => ctx.scene.enter("pagamento"));

export default paymentComposer;
