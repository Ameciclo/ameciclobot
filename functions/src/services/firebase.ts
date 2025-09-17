import { admin } from "../config/firebaseInit";
import {
  AmecicloUser,
  PaymentRequest,
  registeredForms,
  registeredForm,
  TelegramUserInfo,
} from "../config/types";

export async function registerNewForm(registeredForm: registeredForm) {
  await admin
    .database()
    .ref(`registeredForms/${registeredForm.sheetId}`)
    .set({
      ...registeredForm,
    });
}
export async function updateRegisteredFormLastRow(
  newLastRow: number,
  formId: string
): Promise<void> {
  await admin
    .database()
    .ref(`registeredForms/${formId}/lastRow`)
    .set(newLastRow);
}

export async function getRegisteredForms(): Promise<registeredForms> {
  // Lê os formulários cadastrados no Firebase (nó "registeredForms")
  const snapshot = await admin.database().ref("registeredForms").once("value");
  return snapshot.val() || {};
}

export async function getCoordinators() {
  // Busca todos os usuários no endpoint "subscribers"
  const snapshot = await admin.database().ref("subscribers").once("value");
  const data = snapshot.val() || {};

  // Filtra apenas os que possuem role: "AMECICLO_COORDINATORS"
  const coordinatorEntries = Object.values(data).filter(function (entry: any) {
    return entry.role === "AMECICLO_COORDINATORS";
  }) as AmecicloUser[];
  return coordinatorEntries;
}

/**
 * Retorna todos os projetos do nó "financeProjects".
 */
export async function getFinanceProjects(): Promise<any> {
  const snap = await admin.database().ref("financeProjects").once("value");
  return snap.val() || {};
}

/**
 * Sobrescreve (ou cria) todos os projetos no nó "financeProjects" de uma só vez.
 */
export async function saveFinanceProjects(projects: any) {
  await admin.database().ref("financeProjects").set(projects);
}

/**
 * Atualiza apenas um projeto específico no nó "financeProjects/{projectId}".
 */
export async function updateFinanceProject(projectId: string, update: any) {
  await admin.database().ref(`financeProjects/${projectId}`).update(update);
}

export async function sendProjectsToDB(projectsJson: any) {
  await admin.database().ref("projects").set(projectsJson);
  console.log("Firebase: Projetos enviados para o DB.");
}

export async function getFinancesGroupId(): Promise<string> {
  try {
    const snapshot = await admin.database().ref("/workgroups/").once("value");
    const data = snapshot.val() || {};
    const group = process.env.DEV_MODE ? "DEVTEST" : "Financeiro";
    return data[group];
  } catch (err) {
    console.error("Erro ao buscar ID do grupo financeiro:", err);
    return "";
  }
}

export async function getWorkgroupId(workgroupName: string): Promise<string> {
  try {
    const snapshot = await admin.database().ref("/workgroups/").once("value");
    const data = snapshot.val() || {};
    return data[workgroupName] || "";
  } catch (err) {
    console.error(`Erro ao buscar ID do grupo de trabalho`);
    return "";
  }
}

export var updatePaymentRequest = async function (
  requestId: string,
  update: Object
) {
  console.log("updatePaymentRequest");
  return new Promise(function (resolve, reject) {
    admin
      .database()
      .ref(`requests/${requestId}`)
      .update(update)
      .then(function (snapshot) {
        return resolve(snapshot);
      })
      .catch(function (err) {
        reject(err);
      });
  });
};

export async function updatePaymentRequestGroupMessage(
  request: PaymentRequest,
  groupMessage: number
) {
  // Armazena o ID da mensagem no Firebase
  await admin.database().ref(`requests/${request.id}`).update({
    group_message_id: groupMessage,
  });

  console.log(
    `Payment-request sent successfully: ${JSON.stringify(groupMessage)}`
  );
}

export async function updatePaymentRequestCoordinatorMessages(
  requestId: string,
  coordinatorMessages: Record<number, number>
) {
  // Armazena os IDs das mensagens enviadas aos coordenadores
  await admin.database().ref(`requests/${requestId}`).update({
    coordinator_messages: coordinatorMessages,
  });

  console.log(`Coordinator messages updated for request`);
}

export async function updatCalendarEvent(event: any, createdEvent: any) {
  await admin.database().ref(`calendar/${event.params.eventId}`).update({
    googleEventId: createdEvent.id,
    googleHtmlLink: createdEvent.htmlLink,
  });

  console.log(
    `Payment-request sent successfully: ${JSON.stringify(createdEvent)}`
  );
}

export async function updateCalendarEventGroupMessage(
  eventId: string,
  groupMessageId: number
) {
  // Armazena o ID da mensagem no nó do calendar/eventId
  await admin.database().ref(`calendar/${eventId}`).update({
    group_message_id: groupMessageId,
  });

  console.log(`Calendar event group message ID updated for event`);
}

// Exemplo de função para buscar dados de um evento específico
export async function getCalendarEventData(eventId: string) {
  const snapshot = await admin
    .database()
    .ref(`calendar/${eventId}`)
    .once("value");
  return snapshot.val();
}

// Exemplo de função para atualizar dados de um evento
export async function updateCalendarEventData(eventId: string, update: any) {
  await admin.database().ref(`calendar/${eventId}`).update(update);
  console.log(`Calendar event updated for event`);
}

// Buscar dados de uma solicitação pelo `requestId`
export async function getRequestData(requestId: string): Promise<any> {
  try {
    const snapshot = await admin
      .database()
      .ref(`/requests/${requestId}`)
      .once("value");
    return snapshot.val() || null;
  } catch (err) {
    console.error(`Erro ao buscar dados da solicitação`);
    throw err;
  }
}

export async function getAllRequests(): Promise<PaymentRequest[]> {
  console.log(`Get All Payment Requests`);
  try {
    const snapshot = await admin.database().ref("requests").once("value");
    return snapshot.val() || [];
  } catch (err) {
    console.error("Erro ao buscar todas as solicitações:", err);
    throw err;
  }
}

// Buscar dados dos assinantes (subscribers)
export async function getSubscribers(): Promise<any[]> {
  console.log(`GETREQUESTDATA: subscribers`);
  try {
    const snapshot = await admin.database().ref("subscribers").once("value");
    return snapshot.val() || [];
  } catch (err) {
    console.error("Erro ao buscar assinantes:", err);
    throw err;
  }
}

export async function saveProtocolRecord(
  protocol: string,
  password: string,
  from: TelegramUserInfo,
  group: number
): Promise<boolean> {
  try {
    const protocolData = {
      protocol,
      password,
      from: from,
      group: group,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      date: new Date().toLocaleString(),
      verificado: false,
      dados_baixados: false,
      status: 'aguardando_resposta', // aguardando_resposta, respondido, aceito, recorrencia
      notificado: false
    };

    const newProtocolRef = admin.database().ref("information_requests").push();
    await newProtocolRef.set(protocolData);

    return true;
  } catch (error) {
    console.error("Error saving protocol:", error);
    return false;
  }
}

// Optional: Function to get all protocols
export async function getProtocolRecords(): Promise<any[]> {
  try {
    const snapshot = await admin
      .database()
      .ref("information_requests")
      .once("value");
    return snapshot.val() ? Object.values(snapshot.val()) : [];
  } catch (error) {
    console.error("Error fetching protocols:", error);
    return [];
  }
}

export async function deleteGroupMessage(
  ctx: any,
  requestData: PaymentRequest
): Promise<void> {
  if (requestData.group_message_id) {
    try {
      const financeGroupId = await getWorkgroupId("Financeiro");
      await ctx.telegram.deleteMessage(financeGroupId, requestData.group_message_id);
    } catch (error: any) {
      if (error.description && error.description.includes("message to delete not found")) {
        console.log("Mensagem do grupo já foi apagada ou não existe mais.");
      } else {
        console.error("Erro ao apagar mensagem do grupo:", error);
      }
    }
  }
}

export async function getUserData(userId: number): Promise<any> {
  try {
    const snapshot = await admin.database().ref(`subscribers/${userId}`).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    return null;
  }
}

export async function updateUserEmail(userId: number, email: string): Promise<boolean> {
  try {
    await admin.database().ref(`subscribers/${userId}/ameciclo_register`).update({
      email: email,
      updated_at: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar dados do usuário:', error);
    return false;
  }
}

// Pedidos de Informação
export async function getAllInformationRequests(): Promise<any> {
  try {
    const snapshot = await admin.database().ref('information_requests').once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Erro ao buscar pedidos de informação:', error);
    return {};
  }
}

export async function getInformationRequestByProtocol(protocolo: string): Promise<any> {
  try {
    const snapshot = await admin.database().ref('information_requests').once('value');
    const requests = snapshot.val() || {};
    return Object.values(requests).find((req: any) => req.protocol === protocolo);
  } catch (error) {
    console.error('Erro ao buscar pedido por protocolo:', error);
    return null;
  }
}

export async function getInformationRequestData(requestKey: string): Promise<any> {
  try {
    const snapshot = await admin.database().ref(`information_requests/${requestKey}/information`).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Erro ao buscar dados do pedido:', error);
    return null;
  }
}

export async function updateRequestStatus(requestKey: string, status: string, notificado: boolean = false): Promise<boolean> {
  try {
    await admin.database().ref(`information_requests/${requestKey}`).update({
      status,
      notificado,
      ultimaAtualizacaoStatus: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return false;
  }
}

export async function updateInformationRequest(requestKey: string, pedidoData: any): Promise<boolean> {
  try {
    const totalRespostas = pedidoData.historicoRespostas?.length || 0;
    const ultimaResposta = pedidoData.historicoRespostas?.[pedidoData.historicoRespostas.length - 1] || null;
    
    // Dados de controle no nó principal
    const controlData = {
      ultimaVerificacao: new Date().toISOString(),
      verificado: true,
      totalRespostas,
      ultimaResposta
    };
    
    // Dados completos do scraping no subnó information
    const informationData = {
      protocolo: pedidoData.protocolo,
      recurso: pedidoData.recurso,
      dataPedido: pedidoData.dataPedido,
      motivo: pedidoData.motivo,
      descricao: pedidoData.descricao,
      historicoRespostas: pedidoData.historicoRespostas,
      mensagemFinal: pedidoData.mensagemFinal,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    await admin.database().ref(`information_requests/${requestKey}`).update(controlData);
    await admin.database().ref(`information_requests/${requestKey}/information`).set(informationData);
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return false;
  }
}

export async function getInformationRequestKey(protocolo: string): Promise<string | null> {
  try {
    const snapshot = await admin.database().ref('information_requests').once('value');
    const requests = snapshot.val() || {};
    
    for (const [key, req] of Object.entries(requests)) {
      if ((req as any).protocol === protocolo) {
        return key;
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar chave do pedido:', error);
    return null;
  }
}

export async function setTempData(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
  try {
    await admin.database().ref(`temp_data/${key}`).set({
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  } catch (error) {
    console.error('Erro ao salvar dados temporários:', error);
  }
}

export async function getTempData(key: string): Promise<any> {
  try {
    const snapshot = await admin.database().ref(`temp_data/${key}`).once('value');
    const result = snapshot.val();
    
    if (!result) return null;
    
    if (Date.now() > result.expires) {
      await admin.database().ref(`temp_data/${key}`).remove();
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar dados temporários:', error);
    return null;
  }
}

export async function getCachedFolders(parentFolderId: string): Promise<any[]> {
  try {
    const snapshot = await admin.database().ref(`cached_folders/${parentFolderId}`).once('value');
    return snapshot.val()?.folders || [];
  } catch (error) {
    console.error('Erro ao buscar pastas em cache:', error);
    return [];
  }
}

export async function setCachedFolders(parentFolderId: string, folders: any[]): Promise<void> {
  try {
    await admin.database().ref(`cached_folders/${parentFolderId}`).set({
      folders,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao salvar pastas em cache:', error);
  }
}
