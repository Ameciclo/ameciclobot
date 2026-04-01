import { classifyMovement } from "../services/reconciliation/classifier";
import { reconcileExtractEntry } from "../services/reconciliation/reconciler";
import { ExtractEntry } from "../services/reconciliation/types";
import { PaymentRequest } from "../config/types";

// Test data
const testEntry: ExtractEntry = {
  postDate: new Date("2024-01-15"),
  amount: 150.00,
  type: "D",
  narrative: "Pix - Enviado 14:30 JOAO DA SILVA",
  historyCode: "PIX",
  sourceId: "bb_cc_76849_9",
  originalData: []
};

const testRequest: PaymentRequest = {
  id: "PAG-2024-001",
  value: "150,00",
  paymentDate: "15/01/2024",
  description: "Material gráfico",
  status: "confirmed",
  supplier: { name: "João da Silva", nickname: "João" },
  project: { name: "Projeto Teste", account: "76.849-9" }
} as PaymentRequest;

// Test classification
console.log("=== TESTE CLASSIFICAÇÃO ===");
try {
  const classified = classifyMovement(testEntry);
  console.log("✅ Classificação:", classified);
} catch (error) {
  console.log("❌ Erro na classificação:", error);
}

// Test reconciliation
console.log("\n=== TESTE RECONCILIAÇÃO ===");
try {
  const result = reconcileExtractEntry(testEntry, [testRequest]);
  console.log("✅ Reconciliação:", result);
} catch (error) {
  console.log("❌ Erro na reconciliação:", error);
}

// Test bank fee
console.log("\n=== TESTE TARIFA BANCÁRIA ===");
const feeEntry: ExtractEntry = {
  ...testEntry,
  narrative: "TARIFA PACOTE SERVICOS",
  amount: 15.90
};

try {
  const classified = classifyMovement(feeEntry);
  console.log("✅ Tarifa classificada:", classified);
  
  const result = reconcileExtractEntry(feeEntry, [testRequest]);
  console.log("✅ Tarifa reconciliada:", result);
} catch (error) {
  console.log("❌ Erro:", error);
}

// Test investment
console.log("\n=== TESTE INVESTIMENTO ===");
const investEntry: ExtractEntry = {
  ...testEntry,
  narrative: "Aplicacao BB Rende Fácil",
  amount: 1000.00
};

try {
  const classified = classifyMovement(investEntry);
  console.log("✅ Investimento classificado:", classified);
  
  const result = reconcileExtractEntry(investEntry, [testRequest]);
  console.log("✅ Investimento reconciliado:", result);
} catch (error) {
  console.log("❌ Erro:", error);
}