import { Telegraf } from "telegraf";
import workgroups from "../credentials/workgroupsfolders.json";
import { updateFolderTree } from "../services/folderService";

export async function updateFolderStructures(bot: Telegraf): Promise<void> {
  console.log('[Scheduler] Atualizando estruturas de pastas...');
  
  for (const group of workgroups) {
    try {
      await updateFolderTree(group.value);
      console.log(`[Scheduler] Atualizado: ${group.label}`);
    } catch (error) {
      console.error(`[Scheduler] Erro em ${group.label}:`, error);
    }
  }
  
  console.log('[Scheduler] Atualização de pastas concluída');
}