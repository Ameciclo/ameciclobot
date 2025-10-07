import { admin } from "../config/firebaseInit";

interface WeeklyReportData {
  recursos: {
    vendasPendentes: number;
    totalArrecadado: number;
    doacoesConfirmadas: number;
  };
  bicicletas: {
    emprestadas: number;
    devolvidas: number;
    atrasadas: number;
  };
  biblioteca: {
    atrasados: number;
    novosEmprestimos: number;
  };
}

export async function getWeeklyReportData(): Promise<WeeklyReportData> {
  console.log("[report-service] Iniciando getWeeklyReportData");
  const { startDate, endDate } = getLastWeekDates();
  console.log("[report-service] Período:", new Date(startDate), "até", new Date(endDate));
  
  console.log("[report-service] Coletando dados...");
  const [recursos, bicicletas, biblioteca] = await Promise.all([
    getRecursosData(startDate, endDate),
    getBicicletasData(startDate, endDate),
    getBibliotecaData(startDate, endDate)
  ]);
  console.log("[report-service] Dados coletados com sucesso");

  return { recursos, bicicletas, biblioteca };
}

function getLastWeekDates() {
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - now.getDay() - 6);
  lastMonday.setHours(0, 0, 0, 0);
  
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  
  return {
    startDate: lastMonday.getTime(),
    endDate: lastSunday.getTime()
  };
}

async function getRecursosData(startDate: number, endDate: number) {
  console.log("[report-service] Coletando dados de recursos");
  const [salesSnapshot, donationsSnapshot] = await Promise.all([
    admin.database().ref('resources/sales').once('value'),
    admin.database().ref('resources/donations').once('value')
  ]);
  console.log("[report-service] Snapshots de recursos obtidos");

  const sales = salesSnapshot.val() || {};
  const donations = donationsSnapshot.val() || {};

  let vendasPendentes = 0;
  let totalArrecadado = 0;
  let doacoesConfirmadas = 0;

  // Vendas pendentes (status PENDING)
  Object.values(sales).forEach((sale: any) => {
    if (sale.status === 'PENDING') {
      vendasPendentes++;
    }
    if (sale.status === 'CONFIRMED' && 
        sale.confirmedAt >= startDate && sale.confirmedAt <= endDate) {
      totalArrecadado += sale.totalValue || 0;
    }
  });

  // Doações confirmadas na semana
  Object.values(donations).forEach((donation: any) => {
    if (donation.status === 'CONFIRMED' && 
        donation.confirmedAt >= startDate && donation.confirmedAt <= endDate) {
      doacoesConfirmadas++;
      totalArrecadado += donation.value || 0;
    }
  });

  return { vendasPendentes, totalArrecadado, doacoesConfirmadas };
}

async function getBicicletasData(startDate: number, endDate: number) {
  console.log("[report-service] Coletando dados de bicicletas");
  const snapshot = await admin.database().ref('emprestimos_bicicletas').once('value');
  const emprestimos = snapshot.val() || {};
  console.log("[report-service] Empréstimos bicicletas:", Object.keys(emprestimos).length);

  let emprestadas = 0;
  let devolvidas = 0;
  let atrasadas = 0;

  Object.values(emprestimos).forEach((emp: any) => {
    const dataSaida = new Date(emp.data_saida).getTime();

    // Emprestadas na semana
    if (dataSaida >= startDate && dataSaida <= endDate) {
      emprestadas++;
    }

    // Devolvidas na semana
    if (emp.data_devolucao) {
      const dataDevolucao = new Date(emp.data_devolucao).getTime();
      if (dataDevolucao >= startDate && dataDevolucao <= endDate) {
        devolvidas++;
      }
    }

    // Atrasadas (emprestado há mais de 7 dias sem devolução)
    if (emp.status === 'emprestado') {
      const diasEmprestado = (Date.now() - dataSaida) / (1000 * 60 * 60 * 24);
      if (diasEmprestado > 7) {
        atrasadas++;
      }
    }
  });

  return { emprestadas, devolvidas, atrasadas };
}

async function getBibliotecaData(startDate: number, endDate: number) {
  console.log("[report-service] Coletando dados de biblioteca");
  const snapshot = await admin.database().ref('loan_record').once('value');
  const emprestimos = snapshot.val() || {};
  console.log("[report-service] Empréstimos biblioteca:", Object.keys(emprestimos).length);

  let atrasados = 0;
  let novosEmprestimos = 0;

  Object.values(emprestimos).forEach((emp: any) => {
    const dataSaida = new Date(emp.data_saida).getTime();

    // Novos empréstimos na semana
    if (dataSaida >= startDate && dataSaida <= endDate) {
      novosEmprestimos++;
    }

    // Atrasados (emprestado há mais de 15 dias sem devolução)
    if (emp.status === 'emprestado') {
      const diasEmprestado = (Date.now() - dataSaida) / (1000 * 60 * 60 * 24);
      if (diasEmprestado > 15) {
        atrasados++;
      }
    }
  });

  return { atrasados, novosEmprestimos };
}

export function formatReportMessage(data: WeeklyReportData): { captacao: string; secretaria?: string } {
  const captacao = `📊 **Relatório Semanal - Captação**

🛒 **Recursos Independentes:**
• Vendas pendentes: ${data.recursos.vendasPendentes}
• Total arrecadado: R$ ${data.recursos.totalArrecadado.toFixed(2)}
• Doações confirmadas: ${data.recursos.doacoesConfirmadas}

🚴 **Bota pra Rodar:**
• Bicicletas emprestadas: ${data.bicicletas.emprestadas}
• Bicicletas devolvidas: ${data.bicicletas.devolvidas}
• Empréstimos atrasados: ${data.bicicletas.atrasadas}`;

  let secretaria: string | undefined;
  if (data.biblioteca.atrasados > 0) {
    secretaria = `📚 **Relatório Semanal - Biblioteca**

• Livros em atraso: ${data.biblioteca.atrasados}
• Novos empréstimos: ${data.biblioteca.novosEmprestimos}

⚠️ Verificar devoluções pendentes.`;
  }

  return { captacao, secretaria };
}