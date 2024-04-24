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
const telegraf_1 = require("telegraf");
// you can also pass step handlers as Composer
// and attach any methods you need
const startComposer = new telegraf_1.Composer();
const scene = new telegraf_1.Scenes.WizardScene("sceneId", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply("Step 1", telegraf_1.Markup.inlineKeyboard([telegraf_1.Markup.button.callback("Go to Step 2", "next")]));
}), (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply("Step 2. Final step, send /done to finish", telegraf_1.Markup.inlineKeyboard([telegraf_1.Markup.button.callback("Finish", "done")]));
    return ctx.wizard.next();
}), (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.answerCbQuery();
    console.log("/PAGAMENTO: Done");
    yield ctx.reply("Pagamento finalizado com sucesso!");
    return yield ctx.scene.leave();
}));
// to compose all scenes you use Stage
const stage = new telegraf_1.Scenes.Stage([scene]);
startComposer.use((0, telegraf_1.session)());
// this attaches ctx.scene to the global context
startComposer.use(stage.middleware());
// you can enter the scene only AFTER registering middlewares
// otherwise ctx.scene will be undefined
startComposer.command("start", (ctx) => ctx.scene.enter("sceneId"));
exports.default = startComposer;
//# sourceMappingURL=index.js.map