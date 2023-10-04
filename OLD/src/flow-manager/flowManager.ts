import { Flow } from "./flow";
import { Extra, Markup, CallbackButton, ContextMessageUpdate } from "telegraf";
import { Message } from "telegraf/typings/telegram-types";
import utils = require("../aux/utils");

export class FlowManager {
    flows: Flow[] = []

    constructor(flowControllers: Flow[] = []) {
        for (const flow of flowControllers) {
            this.flows.push(flow)
        }
    }

    async handle(ctx: ContextMessageUpdate): Promise<boolean | Message> {
        const anyCtx = <any>ctx
        const flowIndex = anyCtx.session?.flow
        const callbackQuery = anyCtx.update?.callback_query?.data;
        const command = anyCtx.update?.message?.text ? utils.extractCommand(anyCtx.update?.message?.text) : undefined;
        const first_name = anyCtx.from?.first_name

        console.log(`FLOW MANAGER HANDLE: usuário ${first_name} enviou comando ${command} com index ${flowIndex}`);

        if (command === "/iniciar"  || command === "/start") {
            anyCtx.session.flow = -1;
            console.log("/START COMMAND");
            const isAdmin = false
            const result = await anyCtx.reply(`Oi, ${first_name}, o que você deseja fazer?`, Extra.markup(Markup.inlineKeyboard(this.getButtons(isAdmin), { columns: 1 })))
            //console.log(result);
            anyCtx.session.messageId = result.message_id;
            anyCtx.session.chatId = result.chat.id;
            return result;
        }

        if ((flowIndex !== undefined) && (flowIndex !== -1) && (command === undefined || command[0] !== "/")) {
            return this.flows[flowIndex].flowHandler(ctx);
        }

        const foundFlow = this.flows.find((flow, index) => {
            if (flow.steps[0].callback === callbackQuery || flow.command === command) {
                (<any>ctx).session.flow = index;
                return true;
            }
            return false;
        })

        if (foundFlow) {
            return foundFlow.flowHandler(ctx)
        } else {
            return Promise.resolve(false);
        }
    }

    insertFlow(flow: Flow) {
        this.flows.push(flow);
    }

    getButtons(isAdmin: boolean = false): CallbackButton[] {
        const buttons: CallbackButton[] = [];

        this.flows.forEach(flow => {
            if (flow.onlyForAdmin && !isAdmin) return;
            buttons.push(Markup.callbackButton(flow.menuText, flow.steps[0].callback))
        })

        return buttons;
    }

    //   testCommand(ctx: ContextMessageUpdate) {
    //     if (ctx.session.groupId === groupChatId) {
    //       ctx.session.groupId = testGroup;
    //       ctx.session.isDebugMode = true;
    //       return ctx.reply("Modo de teste ativado! 🐞");
    //     } else {
    //       ctx.session.groupId = groupChatId;
    //       ctx.session.isDebugMode = false;
    //       return ctx.reply("Modo de teste desativado! ✅");
    //     }
    //   }

    //   helpCommand(ctx: ContextMessageUpdate) {
    //     console.log(ctx.chat);
    //     ctx.reply(`Oi ${ctx.from.first_name}, \n\n
    //     Seu TelegramID é: ${ctx.chat.id}\n\nNós podemos utilizá-lo para ampliar nossas conexões, facilitar nossa comunicação e agilizar nossas ações.\n\nEu sou o @ameciclobot.\n♥️Hoje eu faço:\n  * Links e informações úteis e de projetos para usar no dia a dia do cicloativismo recifense\n  * Avisar no inbox a agenda da Ameciclo do dia seguinte;\n  * Transparência dos nossos gastos\n  * Sugerir pauta para a Reunião Ordinária\n\n ⚙Além disso eu:\n  * Aviso ao GT seus eventos específicos\n  * Permito à coordenação de projetos solicitar pagamentos\n  * Mando mensagens importantes para todos os GTs\n  * Integro com planilhas e agenda\n\n  Em breve, mais funções. Vem ni mim!\n\n  Mais sobre a Ameciclo:\n  www.ameciclo.org\n \n  Nossas redes:\n  t.me/s/ameciclo\n  instagram.com/ameciclo\n facebook.com/ameciclo`);
    //   }
      
}