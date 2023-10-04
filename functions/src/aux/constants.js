//////////////////////////////////////////////////////////////////////////////////////////////
// ESTE ARQUIVO CONTÉM CONSTANTES E FUNÇÕES QUE PODEM SER UTILIZADAS POR MÚLTIPLOS ARQUIVOS //
//
// ORGANIZAÇÃO DO ARQUIVO
// 1. Constantes
// 2. Funções

export const defaultMessages = {
  attention: "Responda essa mensagem (deslize pra ⬅️ ou duplo clique).",
  error: {
    notRecognizedCallback:
      "Interação não reconhecida pelo bot, tente novamente ou entre em contato com o suporte",
  },
};

export const symbols = {
  numbers: ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"],
  boolean: ["❌", "✅"],
  text: {
    help: "❓",
    info: "💭",
    alert: "⚠️",
  },
  indicator: "🔴",
  next_indicator: "⚪️",
  before_indicator: "🟢",
};
export const buttonsText = {
  confirm: "✔️ Confirmar",
  next: "▶️ Avançar",
  back: "◀️ Voltar",
  cancel: "✖️ Cancelar",
};

// export const flow = {
//     SEND_MESSAGE: 22,
//     INFORMATION_REQUEST: 3
// }

export const startFlowPrefix = "start";

export const actions = {
  DURATION_INCREMENT: "durationIncrement",
};

//export const hangoutUrl = "Acontecerá em: sala.ameciclo.org\n\n";

export const doctypes = [
  {
    name: "📄 Ata (Interna)",
    type: "docText",
    saveName: "Ata",
  },
  {
    name: "📄 Relato (Externa)",
    type: "docText",
    saveName: "Relato",
  },
  {
    name: "📄 Documento em branco",
    type: "docText",
    saveName: "Documento",
  },
  {
    name: "📊 Planilha Financeira",
    type: "docSS",
    saveName: "Planilha Financeira",
  },
  {
    name: "📊 Planilha em branco",
    type: "docSS",
    saveName: "Planilha",
  },
  {
    name: "📊 Planilha de contagem",
    type: "docSS",
    saveName: "Contagem",
  },
  {
    name: "🖥 Apresentação",
    type: "docPres",
    saveName: "Apresentação",
  },
  {
    name: "📝 Formulário",
    type: "docForm",
    saveName: "Formulário",
  },
];
