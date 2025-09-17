// src/commands/atualizarPendenciasCommand.ts
import { Context, Telegraf } from "telegraf";
import {
  getSummaryData,
  getIdFromUrl,
  getProjectDetailsPendencias,
  getProjectDetailsPendenciasCount,
} from "../services/google";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";
import workgroups from "../credentials/workgroupsfolders.json";
import {
  getFinanceProjects,
  saveFinanceProjects,
  updateFinanceProject,
} from "../services/firebase";

export async function processProjectsByStatus(ctx: Context, projectStatus: string) {
  try {
    console.log(`[atualizar_pendencias] Processando projetos com status: ${projectStatus}`);

    // Restrição: somente no grupo Financeiro
    const currentChatId = ctx.chat?.id?.toString();
    const financeiroGroup = workgroups.find(
      (group: any) => group.label === projectsSpreadsheet.workgroup
    );
    if (!financeiroGroup) {
      console.log("[atualizar_pendencias] Grupo Financeiro não configurado.");
      return ctx.reply("Workgroup Financeiro não configurado.");
    }
    if (currentChatId !== financeiroGroup.value) {
      console.log(
        "[atualizar_pendencias] Comando executado fora do grupo Financeiro."
      );
      return ctx.reply(
        "Este comando só pode ser executado no grupo Financeiro."
      );
    }

    console.log("[atualizar_pendencias] Grupo Financeiro confirmado.");

    // 1. Lê a planilha RESUMO e monta a lista de projetos
    const summaryData = await getSummaryData(projectsSpreadsheet.id);
    const headers = projectsSpreadsheet.headers;
    const projetosResumo: {
      id: string;
      name: string;
      spreadsheetLink: string;
      projectStatus: string;
    }[] = [];
    // Considera que a primeira linha é o cabeçalho
    for (let rowIndex = 1; rowIndex < summaryData.length; rowIndex++) {
      const row = summaryData[rowIndex];
      const linkPlanilha = row[headers.id.col];
      if (!linkPlanilha) continue;
      const projectSpreadsheetId = getIdFromUrl(linkPlanilha);
      const nomeProjeto = row[headers.name.col];
      const statusProjeto = row[headers.status.col];
      projetosResumo.push({
        id: projectSpreadsheetId,
        name: nomeProjeto,
        spreadsheetLink: linkPlanilha,
        projectStatus: statusProjeto,
      });
    }
    console.log(
      `[atualizar_pendencias] Projetos lidos do RESUMO: ${projetosResumo.length}`
    );

    // 2. Obtém os projetos já salvos no Firebase (financeProjects)
    const financeProjectsInDb = await getFinanceProjects(); // Objeto { projectId: { ... } }
    // 3. Mescla os dados: preserva lastVerificationDate, pendencias e status
    const mergedProjects: Record<string, any> = {};
    for (const p of projetosResumo) {
      const existing = financeProjectsInDb[p.id] || {};
      mergedProjects[p.id] = {
        name: p.name,
        spreadsheetLink: p.spreadsheetLink,
        lastVerificationDate: existing.lastVerificationDate || "",
        projectStatus: p.projectStatus,
        pendencias:
          typeof existing.pendencias === "number" ? existing.pendencias : 0,
        status: existing.status || "OK", // "OK" indica que o acesso está concedido
      };
    }
    // Salva a estrutura mesclada no Firebase
    await saveFinanceProjects(mergedProjects);
    console.log("[atualizar_pendencias] Dados mesclados salvos no Firebase.");

    // 4. Define a data de hoje (formato YYYY-MM-DD)
    const date = new Date();
    const hoje =
      date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');

    // 5. Filtra os projetos que precisam ser verificados hoje:
    //    se lastVerificationDate não for hoje ou se o status já estiver como "Acesso não concedido"
    const projetosParaAtualizar = Object.keys(mergedProjects).filter(
      (projectId) => {
        const proj = mergedProjects[projectId];
        return (
          proj.lastVerificationDate !== hoje &&
          proj.projectStatus == projectStatus
        ); // Se já foi verificado hoje, não refaz.
      }
    );
    console.log(
      "[atualizar_pendencias] Projetos a Atualizar:",
      projetosParaAtualizar.length
    );

    if (projetosParaAtualizar.length === 0) {
      return ctx.reply("Nenhum projeto para atualizar.");
    }

    // 6. Para cada projeto a ser verificado, tenta ler a aba de detalhes e contar as pendências.
    for (const projectId of projetosParaAtualizar) {
      try {
        const countMissing = await getProjectDetailsPendenciasCount(projectId);
        mergedProjects[projectId].pendencias = countMissing;
        mergedProjects[projectId].status = "OK";
        mergedProjects[projectId].lastVerificationDate = hoje;
        // Atualiza este projeto no Firebase
        await updateFinanceProject(projectId, {
          pendencias: countMissing,
          status: "OK",
          lastVerificationDate: hoje,
        });
        console.log(
          `[atualizar_pendencias] Projeto ${mergedProjects[projectId].name} verificado: ${countMissing} pendências.`
        );
      } catch (err: any) {
        console.error(
          `[atualizar_pendencias] Erro ao Atualizar projeto ${mergedProjects[projectId].name} (${projectId}):`,
          err
        );
        // Se o erro indicar "permission" ou "forbidden", atualiza o status e não tenta novamente hoje
        if (err.response && err.response.status === 403) {
          mergedProjects[projectId].status = "Acesso não concedido";
          mergedProjects[projectId].lastVerificationDate = hoje;
          await updateFinanceProject(projectId, {
            status: "Acesso não concedido",
            lastVerificationDate: hoje,
          });
          console.log(
            `[atualizar_pendencias] Projeto ${mergedProjects[projectId].name}: Acesso não concedido.`
          );
        }
        // Para outros erros, você pode decidir se ignora ou se para o comando.
      }
    }

    // 7. Monta a mensagem de retorno com os projetos que possuem pendências > 0 ou status "Acesso não concedido"
    const linhas: string[] = [];
    for (const projectId of Object.keys(mergedProjects)) {
      const proj = mergedProjects[projectId];
      // Exibe apenas se houver pendências ou se o status indicar problema de acesso
      if (proj.status === "Acesso não concedido" || proj.pendencias > 0) {
        let linha = `• [${proj.name}](${proj.spreadsheetLink}) `;
        if (proj.status === "Acesso não concedido") {
          linha += "– Acesso não concedido.";
        } else {
          linha += `tem ${proj.pendencias}.`;
        }
        linhas.push(linha);
      }
    }

    let resposta = "";
    if (linhas.length === 0) {
      resposta = "Nenhuma pendência encontrada em nenhum projeto.";
    } else {
      resposta = "Projetos com pendências encontradas:\n" + linhas.join("\n");
    }

    console.log("[atualizar_pendencias] Comando concluído com sucesso.");
    await ctx.replyWithMarkdown(resposta, { link_preview_options: { is_disabled: true } });
    return; // Garante retorno para evitar warning de paths
  } catch (error) {
    console.error("[atualizar_pendencias] Erro geral:", error);
    await ctx.reply("Erro ao Atualizar pendências.");
    return;
  }
}

export async function listProjectsInProgress(ctx: Context): Promise<void> {
  try {
    console.log("[atualizar_pendencias] Listando projetos em andamento");

    // Restrição: somente no grupo Financeiro
    const currentChatId = ctx.chat?.id?.toString();
    const financeiroGroup = workgroups.find(
      (group: any) => group.label === projectsSpreadsheet.workgroup
    );
    if (!financeiroGroup || currentChatId !== financeiroGroup.value) {
      await ctx.reply("Este comando só pode ser executado no grupo Financeiro.");
      return;
    }

    // Busca projetos em andamento
    const summaryData = await getSummaryData(projectsSpreadsheet.id);
    const headers = projectsSpreadsheet.headers;
    
    const projetosEmAndamento = [];
    for (let rowIndex = 1; rowIndex < summaryData.length; rowIndex++) {
      const row = summaryData[rowIndex];
      const nomeProjeto = row[headers.name.col];
      const statusProjeto = row[headers.status.col];
      const linkPlanilha = row[headers.id.col];
      
      if (statusProjeto === "Em andamento" && nomeProjeto && linkPlanilha) {
        projetosEmAndamento.push({
          name: nomeProjeto,
          id: getIdFromUrl(linkPlanilha)
        });
      }
    }

    if (projetosEmAndamento.length === 0) {
      await ctx.reply("Nenhum projeto em andamento encontrado.");
      return;
    }

    // Cria botões para cada projeto (máximo 20 caracteres por botão)
    const keyboard = {
      inline_keyboard: projetosEmAndamento.slice(0, 10).map(projeto => {
        const shortName = projeto.name.length > 20 ? projeto.name.substring(0, 17) + "..." : projeto.name;
        return [{ text: shortName, callback_data: `pendencias_proj_${projeto.id}` }];
      })
    };
    
    keyboard.inline_keyboard.push([{ text: "❌ Cancelar", callback_data: "pendencias_cancel" }]);

    // Verifica se é chamada de callback (tem editMessageText) ou comando direto
    if (ctx.callbackQuery) {
      await ctx.editMessageText(
        `📄 **Projetos Em Andamento** (${projetosEmAndamento.length}):\n\nSelecione um projeto para verificar pendências:`,
        { reply_markup: keyboard, parse_mode: 'Markdown', link_preview_options: { is_disabled: true } }
      );
    } else {
      await ctx.replyWithMarkdown(
        `📄 **Projetos Em Andamento** (${projetosEmAndamento.length}):\n\nSelecione um projeto para verificar pendências:`,
        { reply_markup: keyboard, link_preview_options: { is_disabled: true } }
      );
    }
  } catch (error) {
    console.error("[atualizar_pendencias] Erro ao listar projetos:", error);
    await ctx.reply("Erro ao listar projetos.");
  }
}

export async function processProjectFromCallback(ctx: Context, projectName: string): Promise<void> {
  try {
    console.log(`[atualizar_pendencias] Buscando projeto específico via callback: ${projectName}`);

    // Busca o projeto na planilha RESUMO
    const summaryData = await getSummaryData(projectsSpreadsheet.id);
    const headers = projectsSpreadsheet.headers;
    
    let projetoEncontrado = null;
    for (let rowIndex = 1; rowIndex < summaryData.length; rowIndex++) {
      const row = summaryData[rowIndex];
      const nomeProjeto = row[headers.name.col];
      if (nomeProjeto && (nomeProjeto.toLowerCase().includes(projectName.toLowerCase()) || 
          projectName.toLowerCase().includes(nomeProjeto.toLowerCase()))) {
        const linkPlanilha = row[headers.id.col];
        if (linkPlanilha) {
          projetoEncontrado = {
            id: getIdFromUrl(linkPlanilha),
            name: nomeProjeto,
            spreadsheetLink: linkPlanilha,
            projectStatus: row[headers.status.col]
          };
          break;
        }
      }
    }

    if (!projetoEncontrado) {
      await ctx.editMessageText(`Projeto "${projectName}" não encontrado.`);
      return;
    }

    // Verifica as pendências do projeto específico
    try {
      const pendenciasResult = await getProjectDetailsPendencias(projetoEncontrado.id);
      
      // Atualiza no Firebase
      const date = new Date();
      const hoje = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
      
      await updateFinanceProject(projetoEncontrado.id, {
        pendencias: pendenciasResult.count,
        status: "OK",
        lastVerificationDate: hoje,
      });

      let resposta = `Projeto [${projetoEncontrado.name}](${projetoEncontrado.spreadsheetLink}):\n`;
      if (pendenciasResult.count === 0) {
        resposta += "✅ Nenhuma pendência encontrada.";
      } else {
        resposta += `⚠️ ${pendenciasResult.count} pendência(s) encontrada(s):\n\n`;
        const maxItems = 10; // Limita a 10 itens para evitar MESSAGE_TOO_LONG
        const itemsToShow = pendenciasResult.details.slice(0, maxItems);
        itemsToShow.forEach((item, index) => {
          resposta += `${index + 1}. **${item.fornecedor}** - ${item.descricao} - R$ ${item.valor}\n`;
        });
        if (pendenciasResult.count > maxItems) {
          resposta += `\n... e mais ${pendenciasResult.count - maxItems} pendência(s).`;
        }
      }
      
      await ctx.editMessageText(resposta, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        await ctx.editMessageText(`Projeto "${projetoEncontrado.name}": Acesso não concedido.`);
      } else {
        console.error("Erro ao verificar projeto:", err);
        await ctx.editMessageText(`Erro ao verificar projeto "${projetoEncontrado.name}".`);
      }
    }
  } catch (error) {
    console.error("[atualizar_pendencias] Erro ao processar projeto específico via callback:", error);
    await ctx.editMessageText("Erro ao processar projeto específico.");
  }
}

export async function processSpecificProject(ctx: Context, projectName: string): Promise<void> {
  try {
    console.log(`[atualizar_pendencias] Buscando projeto específico: ${projectName}`);

    // Restrição: somente no grupo Financeiro
    const currentChatId = ctx.chat?.id?.toString();
    const financeiroGroup = workgroups.find(
      (group: any) => group.label === projectsSpreadsheet.workgroup
    );
    if (!financeiroGroup || currentChatId !== financeiroGroup.value) {
      await ctx.reply("Este comando só pode ser executado no grupo Financeiro.");
      return;
    }

    // Busca o projeto na planilha RESUMO
    const summaryData = await getSummaryData(projectsSpreadsheet.id);
    const headers = projectsSpreadsheet.headers;
    
    let projetoEncontrado = null;
    for (let rowIndex = 1; rowIndex < summaryData.length; rowIndex++) {
      const row = summaryData[rowIndex];
      const nomeProjeto = row[headers.name.col];
      if (nomeProjeto && (nomeProjeto.toLowerCase().includes(projectName.toLowerCase()) || 
          projectName.toLowerCase().includes(nomeProjeto.toLowerCase()))) {
        const linkPlanilha = row[headers.id.col];
        if (linkPlanilha) {
          projetoEncontrado = {
            id: getIdFromUrl(linkPlanilha),
            name: nomeProjeto,
            spreadsheetLink: linkPlanilha,
            projectStatus: row[headers.status.col]
          };
          break;
        }
      }
    }

    if (!projetoEncontrado) {
      await ctx.reply(`Projeto "${projectName}" não encontrado.`);
      return;
    }

    // Verifica as pendências do projeto específico
    try {
      const pendenciasResult = await getProjectDetailsPendencias(projetoEncontrado.id);
      
      // Atualiza no Firebase
      const date = new Date();
      const hoje = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
      
      await updateFinanceProject(projetoEncontrado.id, {
        pendencias: pendenciasResult.count,
        status: "OK",
        lastVerificationDate: hoje,
      });

      let resposta = `Projeto [${projetoEncontrado.name}](${projetoEncontrado.spreadsheetLink}):\n`;
      if (pendenciasResult.count === 0) {
        resposta += "✅ Nenhuma pendência encontrada.";
      } else {
        resposta += `⚠️ ${pendenciasResult.count} pendência(s) encontrada(s):\n\n`;
        const maxItems = 10; // Limita a 10 itens para evitar MESSAGE_TOO_LONG
        const itemsToShow = pendenciasResult.details.slice(0, maxItems);
        itemsToShow.forEach((item, index) => {
          resposta += `${index + 1}. **${item.fornecedor}** - ${item.descricao} - R$ ${item.valor}\n`;
        });
        if (pendenciasResult.count > maxItems) {
          resposta += `\n... e mais ${pendenciasResult.count - maxItems} pendência(s).`;
        }
      }
      
      await ctx.replyWithMarkdown(resposta, { link_preview_options: { is_disabled: true } });
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        await ctx.reply(`Projeto "${projetoEncontrado.name}": Acesso não concedido.`);
      } else {
        await ctx.reply(`Erro ao verificar projeto "${projetoEncontrado.name}".`);
      }
    }
  } catch (error) {
    console.error("[atualizar_pendencias] Erro ao processar projeto específico:", error);
    await ctx.reply("Erro ao processar projeto específico.");
  }
}

function registerAtualizarPendenciasCommand(bot: Telegraf) {
  bot.command("atualizar_pendencias", async (ctx: Context) => {
    try {
      console.log("[atualizar_pendencias] Iniciando comando...");

      // Restrição: somente no grupo Financeiro
      const currentChatId = ctx.chat?.id?.toString();
      const financeiroGroup = workgroups.find(
        (group: any) => group.label === projectsSpreadsheet.workgroup
      );
      if (!financeiroGroup || currentChatId !== financeiroGroup.value) {
        await ctx.reply("Este comando só pode ser executado no grupo Financeiro.");
        return;
      }

      // Verifica se há parâmetro (projeto específico)
      const params = ctx.text?.split(/\s+/).slice(1).join(" ").trim();
      
      if (params) {
        // Busca projeto específico
        await processSpecificProject(ctx, params);
        return;
      }

      // Mostra botões para seleção de status

      const message = "📊 *Atualizar Pendências de Projetos*\n\n" +
        "Selecione o status dos projetos que deseja verificar:\n\n" +
        "💡 *Dica:* Para verificar um projeto específico, use:\n" +
        "`/atualizar_pendencias nome_do_projeto`";

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📋 Todos", callback_data: "pendencias_status_Todos" },
            { text: "✅ Finalizado", callback_data: "pendencias_status_Finalizado" }
          ],
          [
            { text: "🔄 Em andamento", callback_data: "pendencias_status_Em andamento" },
            { text: "⏸️ Não iniciado", callback_data: "pendencias_status_Não iniciado" }
          ],
          [
            { text: "💰 Finalizado com sobras", callback_data: "pendencias_status_Finalizado com sobras" }
          ],
          [
            { text: "📄 Listar Em Andamento", callback_data: "pendencias_list_projects" }
          ],
          [
            { text: "❌ Cancelar", callback_data: "pendencias_cancel" }
          ]
        ]
      };

      await ctx.replyWithMarkdown(message, { reply_markup: keyboard, link_preview_options: { is_disabled: true } });
      return;
    } catch (error) {
      console.error("[atualizar_pendencias] Erro geral:", error);
      await ctx.reply("Erro ao processar comando.");
      return;
    }
  });

  return;


}

export const atualizarPendenciasCommand = {
  register: registerAtualizarPendenciasCommand,
  name: () => "/atualizar_pendencias",
  help: () =>
    "Verifica pendências do DETALHAMENTO DE GASTOS dos projetos por status ou projeto específico. Use botões para selecionar status ou /atualizar_pendencias [nome] para projeto específico.",
  description: () =>
    "Lê a planilha RESUMO, atualiza os projetos no Firebase, verifica pendências nos projetos que não foram verificados hoje e retorna um relatório.",
};