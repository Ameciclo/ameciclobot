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
exports.updatePaymentSummary = exports.displaySummary = void 0;
function displaySummary(ctx) {
    var _a, _b;
    let message = "Dados do Pagamento:\n";
    if ((_a = ctx.session.pagamento) === null || _a === void 0 ? void 0 : _a.project) {
        message += `Projeto: ${ctx.session.pagamento.project.name}\n`;
    }
    if ((_b = ctx.session.pagamento) === null || _b === void 0 ? void 0 : _b.budgetItem) {
        message += `Rubrica: ${ctx.session.pagamento.budgetItem}\n`;
    }
    return message;
}
exports.displaySummary = displaySummary;
function updatePaymentSummary(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const summary = displaySummary(ctx);
        if (ctx.session.summaryMessageId) {
            yield ctx.telegram.editMessageText(ctx.chat.id, ctx.session.summaryMessageId, undefined, summary);
        }
        else {
            const sentMessage = yield ctx.reply(summary);
            ctx.session.summaryMessageId = sentMessage.message_id;
        }
    });
}
exports.updatePaymentSummary = updatePaymentSummary;
//# sourceMappingURL=aux.js.map