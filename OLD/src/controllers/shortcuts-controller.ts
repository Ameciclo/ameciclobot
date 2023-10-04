// SHORTCUTS
// /links lista os links
// /links nome url - se for admin adiciona para o menu de links
// colocar um +links
// colocar um menu de remoção de links

// ADICIONAR links aos subdomínios

import { Flow } from "../flow-manager/flow";
import { Step } from "../flow-manager/step";
import { Markup } from "telegraf";

export class Controller {

    getFlow(): Flow {
        const shortcutsStep = new Step("🔗 Links úteis");
        shortcutsStep.loadButtons = async function () {
            const menuItems = [
                Markup.urlButton('📚 Biciclopedia', `http://biciclopedia.ameciclo.org/`),
                Markup.urlButton('👩‍👩‍👧‍👦 Grupos de Trabalho', `http://gts.ameciclo.org/`),
                Markup.urlButton('🗂 Drive da Ameciclo', `http://drive.ameciclo.org/`),
                Markup.urlButton('📄 Ver pautas para R.O', `http://pautas.ameciclo.org/`),
                Markup.urlButton('📈 Acompanhar nossos gastos', `http://transparencia.ameciclo.org/`),
                Markup.urlButton('🏠 Ocupar a sede', `http://ocupe.ameciclo.org/`),
                Markup.urlButton('🎥 Requisitar equipamento', `http://equipamento.ameciclo.org/`)
            ]

            return menuItems;
        }

        // const seeAgendasButton = Markup.callbackButton('🗓 Nossas Agendas Google', 'verAgendas');
        return new Flow("", [shortcutsStep], "🔗 Links úteis", "/links");
    }

}