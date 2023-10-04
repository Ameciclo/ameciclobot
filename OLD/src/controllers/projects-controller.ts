// PROJETOS
// No inbox - /projetos - lista projetos
// No GT /projetos - lista projetos do GT e a opção adicionar projetos
// /projetos nome-do-projeto
// Começa o menu de adição
// Cria pasta na pasta de projetos e faz link na pasta de GTs
// Cria uma planilha modelo
// Retorna links
// O menu pede um EMOJI pro projeto


import { Flow } from "../flow-manager/flow";
import { Step } from "../flow-manager/step";
import { Markup } from "telegraf";

export class Controller {

    getFlow(): Flow {
        const projectsStep = new Step("ℹ️ Informações de projetos");
        projectsStep.loadButtons = async function () {
            const menuItems = [
                //Markup.urlButton('🚧 Observatório do PDC', `http://pdc.ameciclo.org/`),
                Markup.urlButton('🧮 Contagens', `http://contagem.ameciclo.org/`),
                Markup.urlButton('🚴‍♀️ Bota pra Rodar', `http://botaprarodar.ameciclo.org/`),
                Markup.urlButton('🛣 Ideciclo', `http://ideciclo.ameciclo.org/`),
                Markup.urlButton('👁‍🗨 Pesquisa Perfil', `http://perfil.ameciclo.org/`),
                Markup.urlButton('🚸 Desafio Intermodal', `http://dim.ameciclo.org/`),
                Markup.urlButton('🗺 Ciclomapa', `http://mapa.ameciclo.org/`)
            ]

            return menuItems;
        }

        return new Flow("", [projectsStep], "ℹ️ Informações de projetos", "/projetos");
    }

}

// SO LISTAR PROJETOS
// import { Flow } from "../flow-manager/flow";
// import { Step } from "../flow-manager/step";
// import { Markup } from "telegraf";

// export class ProjectsController {

//     getFlow(): Flow {
//         const projectsStep = new Step("ℹ️ Informações de projetos");
//         projectsStep.loadButtons = async function () {
//             const menuItems = [
//                 //Markup.urlButton('🚧 Observatório do PDC', `http://pdc.ameciclo.org/`),
//                 Markup.urlButton('🧮 Contagens', `http://contagem.ameciclo.org/`),
//                 Markup.urlButton('🚴‍♀️ Bota pra Rodar', `http://botaprarodar.ameciclo.org/`),
//                 Markup.urlButton('🛣 Ideciclo', `http://ideciclo.ameciclo.org/`),
//                 Markup.urlButton('👁‍🗨 Pesquisa Perfil', `http://ppc.ameciclo.org/`),
//                 Markup.urlButton('🚸 Desafio Intermodal', `http://dim.ameciclo.org/`),
//                 Markup.urlButton('🗺 Ciclomapa', `http://mapa.ameciclo.org/`)
//             ]

//             return menuItems;
//         }

//         return new Flow("", [projectsStep], "ℹ️ Informações de projetos", "/projetos");
//     }

// }