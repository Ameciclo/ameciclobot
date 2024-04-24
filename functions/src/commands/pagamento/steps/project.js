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
exports.project = exports.handleProjectSelection = exports.displayProjects = void 0;
const telegraf_1 = require("telegraf");
const database_1 = require("../database");
const aux_1 = require("../aux");
const displayProjects = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - displayProjects`);
    console.log(`${ctx.myProps}`);
    try {
        const projectsData = yield (0, database_1.fetchProjects)();
        const projects = Object.values(projectsData);
        if (projects.length === 0) {
            yield ctx.reply("Não encontramos nenhum projeto financiado.");
            return ctx.scene.leave();
        }
        const buttons = projects.map((project) => telegraf_1.Markup.button.callback(project.name, `selectProject#${project.spreadsheet_id}`));
        yield ctx.reply("🗂 Escolha um projeto:", telegraf_1.Markup.inlineKeyboard(buttons, { columns: 1 }));
        return ctx.wizard.next();
    }
    catch (err) {
        console.error(err);
        yield ctx.reply("Erro ao carregar projetos.");
        return ctx.scene.leave();
    }
});
exports.displayProjects = displayProjects;
const handleProjectSelection = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - handleProjectSelection`);
    try {
        if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
            const selection = ctx.callbackQuery.data.split("#")[1];
            const projectData = yield (0, database_1.fetchProjectById)(selection);
            yield ctx.reply(`Projeto selecionado: ID ${projectData.name}`);
            ctx.session.pagamento.project = projectData;
            (0, aux_1.updatePaymentSummary)(ctx);
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
        yield ctx.reply("Erro ao encontrar projeto.");
        return ctx.scene.leave();
    }
});
exports.handleProjectSelection = handleProjectSelection;
exports.project = [exports.displayProjects, exports.handleProjectSelection];
//# sourceMappingURL=project.js.map