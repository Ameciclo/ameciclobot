"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scene = void 0;
const telegraf_1 = require("telegraf");
const project_1 = require("./steps/project");
const budget_1 = require("./steps/budget");
//import { suplier } from "./steps/suplier";
//import { value } from "./steps/value";
//import { description as stepDescription } from "./steps/description";
// export const name = "evento";
// export const description = `🗂 Adicionar pagamento`;
// export const help = `🗂 Ajuda do pagamento`;
const paymentComposer = new telegraf_1.Composer();
exports.scene = new telegraf_1.Scenes.WizardScene("pagamento", project_1.displayProjects, project_1.handleProjectSelection, ...budget_1.budget, 
// suplier,
// value,
// stepDescription
(ctx) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("/PAGAMENTO: Done");
    yield ctx.reply("Pagamento finalizado com sucesso!");
    return yield ctx.scene.leave();
}));
const stage = new telegraf_1.Scenes.Stage([exports.scene]);
paymentComposer.use((ctx, next) => {
    ctx.session = ctx.session || {};
    ctx.session.pagamento = ctx.session.pagamento || {};
    return next();
});
paymentComposer.use(stage.middleware());
paymentComposer.command("pagamento", (ctx) => ctx.scene.enter("pagamento"));
exports.default = paymentComposer;
//# sourceMappingURL=index.js.map