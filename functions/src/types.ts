import { Context, Scenes } from "telegraf";
import { pagamento } from "./commands/pagamento/types";

// Definindo os dados de sessão que você quer salvar
interface myProps {
  variable?: string;  // Variável personalizada
}

interface MySession extends Scenes.WizardSession {
  // will be available globally under `ctx.session.mySessionProp`
  summaryMessageId?: number;
  pagamento?: pagamento;  // Dados de pagamento opcional
}

export interface MyContext extends Context {
  // will be availbale globally under ctx.myCtxProp
  session?: MySession;
  myProps?: myProps;
  scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}