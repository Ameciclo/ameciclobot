// src/commands/atualizarPendenciasCommand.ts
import { Context, Telegraf } from "telegraf";
import {
  getSummaryData,
  getIdFromUrl,
  getProjectDetailsPendencias,
} from "../services/google";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";
import workgroups from "../credentials/workgroupsfolders.json";
import {
  getFinanceProjects,
  saveFinanceProjects,
  updateFinanceProject,
} from "../services/firebase";

function registerAtualizarPendenciasCommand(bot: Telegraf) {
  bot.command("atualizar_pendencias", async (ctx: Context) => {
    try {
      console.log("[atualizar_pendencias] Iniciando comando...");

      // Avalia se o comando está seguido de um Project Status, por exemplo /atualizar_pendencias Finalizado
      const customProjectStatus =
        ctx.text?.split(/\s+/, 2)[1]?.trim() || "Em andamento";

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
        date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();

      // 5. Filtra os projetos que precisam ser verificados hoje:
      //    se lastVerificationDate não for hoje ou se o status já estiver como "Acesso não concedido"
      const projetosParaAtualizar = Object.keys(mergedProjects).filter(
        (projectId) => {
          const proj = mergedProjects[projectId];
          return (
            proj.lastVerificationDate !== hoje &&
            proj.projectStatus == customProjectStatus
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
          const countMissing = await getProjectDetailsPendencias(projectId);
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
          // Define o emoji baseado no status do projeto
          let statusEmoji = "";
          switch (proj.projectStatus) {
            case "Em andamento":
              statusEmoji = "🔄";
              break;
            case "Finalizado":
              statusEmoji = "✅";
              break;
            case "Não iniciado":
              statusEmoji = "⏸️";
              break;
            default:
              statusEmoji = "📋";
          }
          
          let linha = `${statusEmoji} [${proj.name}](${proj.spreadsheetLink}) `;
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
      await ctx.replyWithMarkdown(resposta);
      return; // Garante retorno para evitar warning de paths
    } catch (error) {
      console.error("[atualizar_pendencias] Erro geral:", error);
      await ctx.reply("Erro ao Atualizar pendências.");
      return;
    }
  });
}

export const atualizarPendenciasCommand = {
  register: registerAtualizarPendenciasCommand,
  name: () => "/atualizar_pendencias",
  help: () =>
    "Verifica pendências do DETALHAMENTO DE GASTOS dos projetos EM ANDAMENTO e atualiza o status (incluindo acesso negado) Você pode dar o comando /atualizar_projetos [STATUS], para atualizar a lista com aquele status.",
  description: () =>
    "Lê a planilha RESUMO, atualiza os projetos no Firebase, verifica pendências nos projetos que não foram verificados hoje e retorna um relatório.",
};
