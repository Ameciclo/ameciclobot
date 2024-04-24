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
exports.budget = exports.handleBudgetSelection = exports.displayBudgets = void 0;
const telegraf_1 = require("telegraf");
const displayBudgets = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - displayBudgets`);
    try {
        const project = (_a = ctx.session.pagamento) === null || _a === void 0 ? void 0 : _a.project;
        const budget_items = project.budget_items;
        const buttons = budget_items.map((item) => telegraf_1.Markup.button.callback(item, `selectBudget#${item}`));
        yield ctx.reply("🗂 Escolha uma rubrica:", telegraf_1.Markup.inlineKeyboard(buttons, { columns: 1 }));
        return ctx.wizard.next();
    }
    catch (err) {
        console.error(err);
        yield ctx.reply("Erro ao carregar projetos.");
        return ctx.scene.leave();
    }
});
exports.displayBudgets = displayBudgets;
const handleBudgetSelection = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - handleBudgetSelection`);
    try {
        if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
            const selection = ctx.callbackQuery.data.split("#")[1];
            yield ctx.reply(`Rubrica selecionada: ID ${selection}`);
            ctx.session.pagamento.project.budget_items = [selection];
            console.log(ctx.session.pagamento);
            return ctx.wizard.next();
        }
        else {
            console.log("No callbackQuery found, something is wrong.");
            yield ctx.reply("Nenhuma seleção detectada, tente novamente.");
            return ctx.scene.leave();
        }
    }
    catch (err) {
        console.error(err);
        yield ctx.reply("Erro ao encontrar rubrica.");
        return ctx.scene.leave();
    }
});
exports.handleBudgetSelection = handleBudgetSelection;
exports.budget = [exports.displayBudgets, exports.handleBudgetSelection];
//# sourceMappingURL=budget.js.map