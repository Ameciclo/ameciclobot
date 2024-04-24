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
exports.suplier = void 0;
const telegraf_1 = require("telegraf");
const database_1 = require("../database");
const suplier = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ctx.callbackQuery) {
        try {
            const projectsData = yield (0, database_1.fetchProjects)();
            // Convertendo o objeto de projetos em um array
            const projects = Object.values(projectsData);
            if (projects.length === 0) {
                yield ctx.reply("Nenhum projeto encontrado.");
                return ctx.wizard.next();
            }
            const buttons = projects.map((project) => telegraf_1.Markup.button.callback(project.name, `selectProject#${project.spreadsheet_id}`));
            yield ctx.reply("🗂 Escolha um Fornecedor:", telegraf_1.Markup.inlineKeyboard(buttons, { columns: 1 }));
        }
        catch (err) {
            console.error(err);
            yield ctx.reply("Erro ao carregar projetos.");
        }
    }
    return ctx.wizard.next();
});
exports.suplier = suplier;
//# sourceMappingURL=suplier.js.map