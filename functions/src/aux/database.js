// Esse arquivo reune as base de dados

/////////////////////////////////
// ACESSO DOS DADOS NO GOOGLE  //
/////////////////////////////////

const { google } = require("googleapis");
const credentials = require("../credentials/google.json");
const urls = require("../credentials/urls.json");

const fetch = require("node-fetch");

const api_key = process.env.API_KEY;

let getJwt = function () {
  return new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/documents",
      "https://www.google.com/m8/feeds/",
      "https://www.googleapis.com/auth/calendar",
    ]
  );
};

///////////////////////////////////
// ACESSO DOS DADOS NO FIREBASE  //
///////////////////////////////////

const admin = require("firebase-admin");
const endpoints = require("../credentials/endpoints.json");

export const snapshotToArray = (snapshot) =>
  Object.keys(snapshot).map((key) => {
    let item = snapshot[key];
    item["id"] = key;
    return item;
  });

/////////////////////////////////
// ACESSO DOS DADOS NO STRAPI  //
/////////////////////////////////
// PASSAR INFO PARA JSON DE CONFIGURAÇÃO EM CREDENTIALS
// PASSAR ENDPOINT PARA ARGUMENTO
export async function getData() {
  const url = "http://localhost:1337/";
  const endpoint = "projects";
  const res = await fetch(url + endpoint);
  if (res.status !== 200) {
    return {
      redirect: {
        permanent: false,
        destination: "/404",
      },
    };
  }

  //const projects = await res.json();
  return await res.json();

  // const featuredProjects = projects.filter((p) => {
  //   return p.isHighlighted === true;
  // });
  // const numberOfProjects = projects.length;
  // return {
  //   props: {
  //     featuredProjects,
  //     numberOfProjects,
  //   },
  // };
}

/////////////////////////
//  GENERIC FUNCTIONS  //
/////////////////////////

// ADICIONA UMA LINHA NUMA PLANILHA DO GOOGLE

let appendSheetRow = function (spreadsheetId, range, row) {
  const sheets = google.sheets({ version: "v4", auth: getJwt() });
  console.log(`ROW TO SPREADSHEET ${row}`);
  const apiKey = api_key.key;

  return sheets.spreadsheets.values.append(
    {
      spreadsheetId: spreadsheetId,
      range: range,
      key: apiKey,
      valueInputOption: "USER_ENTERED",
      resource: { values: [row] },
    },
    (err, result) => {
      if (err) {
        console.log(`Update sheet error ${err} \n JSON ${JSON.stringify(err)}`);
        throw err;
      } else {
        console.log("Updated sheet: " + result.data.updates.updatedRange);
      }
    }
  );
};

// ADICIONA UMA LINHA NUMA PLANILHA DO GOOGLE COMO UMA PROMESSA

export let appendSheetRowAsPromise = function (spreadsheetId, range, row) {
  const sheets = google.sheets({ version: "v4", auth: getJwt() });
  console.log(`ROW TO SPREADSHEET ${row}`);
  let apiKey = api_key.key;

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.append(
      {
        spreadsheetId: spreadsheetId,
        range: range,
        key: apiKey,
        valueInputOption: "USER_ENTERED",
        resource: { values: [row] },
      },
      (err, result) => {
        if (err) {
          console.log(
            `Update sheet error ${err} \n JSON ${JSON.stringify(err)}`
          );
          reject(err);
          // throw err;
        } else {
          console.log("Updated sheet: " + result.data.updates.updatedRange);
          resolve(result.data.updates.updatedRange);
        }
      }
    );
  });
};

// BAIXA DADOS DO FIREBASE

export let getFromDB = function (endpoint) {
  return new Promise((resolve, reject) => {
    console.log(`getFromDB(${endpoint})`);

    admin
      .database()
      .ref(endpoint)
      .once("value")
      .then((snapshot) => {
        return resolve(snapshotToArray(snapshot.val()));
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// BAIXA APENAS UM DADO ESPECÍFICO DO FIREBASE

export let getSingleItemFromDB = function (endpoint) {
  return new Promise((resolve, reject) => {
    console.log(`getSingleItemFromDB(${endpoint})`);

    admin
      .database()
      .ref(endpoint)
      .once("value")
      .then((snapshot) => {
        return resolve(snapshot.val());
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// BAIXA APENAS O ÚLTIMO ARQUIVO QUE ENTROU NO FIREBASE

export let getLastItemFromDB = function (endpoint) {
  return new Promise((resolve, reject) => {
    console.log(`getLastItemFromDB(${endpoint})`);

    admin
      .database()
      .ref(endpoint)
      .limitToLast(1)
      .once("value")
      .then((snapshot) => {
        return resolve(snapshot.val());
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/////////////////////////
//  TOPICS CONTROLLER  //
/////////////////////////

// SALVA PAUTA NA PLANILHA
export let saveTopic = function (data) {
  const range = urls.topics.range + urls.topics.offset;
  return appendSheetRowAsPromise(urls.topics.id, range, [
    data.date,
    data.group,
    data.author,
    data.topic,
  ]);
};

// SALVA INFORME NA PLANILHA
export let saveInformation = function (data) {
  const range = urls.information.range + urls.information.offset;
  return appendSheetRowAsPromise(urls.information.id, range, [
    data.date,
    data.group,
    data.author,
    data.information,
  ]);
};

// SALVA CLIPPING NA PLANILHA
export let saveClipping = function (data) {
  const range = urls.clipping.range + urls.clipping.offset;
  return appendSheetRowAsPromise(urls.clipping.id, range, [
    data.date,
    data.group,
    data.author,
    data.clipping,
  ]);
};

// SALVA ENCAMINHAMENTOS NA PLANILHA
export let saveReferrals = function (data) {
  const range = urls.referrals.range + urls.referrals.offset;
  return appendSheetRowAsPromise(urls.referrals.id, range, [
    data.date,
    data.group,
    data.author,
    data.referrals,
  ]);
};

// SALVA ENCAMINHAMENTOS DE COMUNICAÇÃO NA PLANILHA
export let saveComunicationReferrals = function (data) {
  // SUBSITUIR A1:D pelo comprimendo do DATA
  const range =
    urls.comunicationReferrals.range + urls.comunicationReferrals.offset;
  return appendSheetRowAsPromise(urls.comunicationReferrals.id, range, [
    data.date,
    data.group,
    data.author,
    data.comunicationReferrals,
  ]);
};

/////////////////////////
//  EVENTS CONTROLLER  //
/////////////////////////

// CRIA UM EVENTO NO CALENDÁRIO GOOGLE

// TODO: timezone ir para outro local

export let createEvent = function (
  name,
  startDate,
  endDate,
  calendarId,
  location = "",
  description = "",
  tag = ""
) {
  const calendar = google.calendar({ version: "v3", auth: getJwt() });
  //const random = Math.floor(Math.random() * 100)

  let event = {
    calendarId: calendarId,
    resource: {
      summary: name,
      location: location,
      description: description,
      id: tag,
      start: {
        dateTime: startDate,
        timeZone: "America/Recife",
      },
      end: {
        dateTime: endDate,
        timeZone: "America/Recife",
      },
    },
  };

  // if (emailTag !== "") {
  //   event.attendees = [{
  //     email: emailTag,
  //     responseStatus: "accepted"
  //   }]
  // }

  return new Promise((resolve, reject) => {
    calendar.events
      .insert(event)
      .then((res) => {
        console.log(`EVENTO CRIADO: ${JSON.stringify(res.data)}`);
        return resolve(res.data);
      })
      .catch((err) => {
        console.log(`Error ${err}`);
        if (err) reject(err);
      });
  });
};

//////////////////
//  DOCUMENTOS  //
//////////////////

export function createDocument(title) {
  const docs = google.docs({ version: "v1", auth: getJwt() });

  let document = {
    requestBody: {
      title: title,
    },
  };

  return new Promise((resolve, reject) => {
    docs.documents
      .create(document)
      .then((res) => {
        console.log(`Resultado ${JSON.stringify(res.data)}`);
        return resolve(res.data);
      })
      .catch((err) => {
        console.log(`Error ${err}`);
        if (err) reject(err);
      });
  });
}

/////////////////////////////
// SUBSCRIBERS CONTROLLER //
/////////////////////////////

// ATUALIZA INSCRITO NA AGENDA

export let updateSubscriber = function (subscriber) {
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(`${endpoints.subscribers_test}`)
      .update(subscriber)
      .then((snapshot) => {
        return resolve(snapshot.exists());
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// VERIFICA SE ESTÁ INSCRITO NA AGENDA

export let isUserSubscribed = function (userId) {
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(`${endpoints.subscribers}/${userId}`)
      .once("value")
      .then((snapshot) => {
        return resolve(snapshot.exists());
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// REMOVE INSCRITO DA AGENDA

export let unsubscribeUser = function (userId) {
  return admin.database().ref(`${endpoints.subscribers}/${userId}`).remove();
};

//////////////////////////
// WORKGROUP CONTROLLER //
//////////////////////////

// PEGA GRUPOS DE TRABALHO

export let getGTs = function () {
  return new Promise((resolve, reject) => {
    console.log("getGTs()");

    admin
      .database()
      .ref(endpoints.workgroup)
      .once("value")
      .then((snapshot) => {
        return resolve(snapshotToArray(snapshot.val()));
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// ADICIONA O ID TELEGRAM À CONTATO

export let addIdToContact = function (from) {
  return admin
    .database()
    .ref(`${endpoints.contacts_requests}/${from.id}/`)
    .set(from);
};

// ADICIONA CONTATO À GRUPO DE TRABALHO

export let addToWorkGroup = function (workgroup) {
  return admin
    .database()
    .ref(`${endpoints.workgroups}/${workgroup.id}/`)
    .set(workgroup);
};

/////////////////////////////
// TRANSPARENCE CONTROLLER //
/////////////////////////////

// SALVA PEDIDOS DE INFORMAÇÃO

export let savePinfRequest = function (from, protocol, password) {
  let pinf = {};
  pinf["protocol"] = protocol;
  pinf["password"] = password;
  pinf["from"] = from;
  pinf["date"] = new Date().getTime();

  return admin
    .database()
    .ref(`${endpoints.information_requests}/${protocol}`)
    .set(pinf);
};

/////////////////////////
// MESSAGES CONTROLLER //
/////////////////////////

// SALVA MENSAGEM NO FIREBASE

export let saveMessage = function (message) {
  message["date"] = new Date().getTime();

  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(`${endpoints.messages}`)
      .push()
      .set(message)
      .then((snapshot) => {
        return resolve(snapshot);
      })
      .catch((err) => {
        reject(err);
      });
  });

  // admin.database().ref("messages").push().set(message);
};

// MODIFICA MENSAGEM NO FIREBASE

export let updateMessage = function (id, message) {
  admin.database().ref(`${endpoints.messages}/${id}`).update(message);
};

/////////////////////////
// PAYMENTS CONTROLLER //
/////////////////////////

// PEGA OS FORNECEDORES

export let getRecipients = function () {
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(endpoints.recipients)
      .orderByChild("name")
      .once("value")
      .then((snapshot) => {
        return resolve(snapshotToArray(snapshot.val()));
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// SALVA UMA REQUISIÇÃO DE PAGAMENTO

export let savePaymentRequest = async function (paymentRequest) {
  paymentRequest.date = new Date().getTime();
  paymentRequest.invoice_url = "";

  return new Promise((resolve, reject) => {
    const ref = admin.database().ref(endpoints.requests);
    const key = ref.push().key;

    paymentRequest.id = key;

    ref
      .child(key)
      .update(paymentRequest)
      .then((snapshot) => {
        return resolve(snapshot);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export let saveCashPaymentRequest = async function (paymentRequest) {
  paymentRequest.date = new Date().getTime();
  paymentRequest.invoice_url = "";

  return new Promise((resolve, reject) => {
    const ref = admin.database().ref(endpoints.requests);
    const key = ref.push().key;

    paymentRequest.id = key;

    ref
      .child(key)
      .update(paymentRequest)
      .then((snapshot) => {
        return resolve(snapshot);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// PEGA UMA REQUISIÇÃO DE PAGAMENTO

export let getPaymentRequest = function (requestId) {
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(`${endpoints.requests}/${requestId}`)
      .once("value")
      .then((snapshot) => {
        return resolve(snapshot);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// ATUALIZA UMA REQUISIÇÃO DE PAGAMENTO

export let updatePaymentRequest = async function (requestId, update) {
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(`${endpoints.requests}/${requestId}`)
      .update(update)
      .then((snapshot) => {
        return resolve(snapshot);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

// CONFIRMA UMA REQUISIÇÃO DE PAGAMENTO

export let confirmPaymentRequest = function (user, requestId) {
  return admin
    .database()
    .ref(`/${endpoints.requests}/${requestId}/confirmed_by/${user.id}`)
    .set(user);
};

// CANCELA UMA REQUISIÇÃO DE PAGAMENTO

export let cancelPaymentRequestById = function (id) {
  return admin
    .database()
    .ref(`/${endpoints.requests}/${id}/`)
    .once("value", (snapshot) => {
      admin.database().ref(`/${endpoints.requests}/${id}/`).remove();
      return snapshot;
    });
};
// ctx.deleteMessage(snapshot.val()["group_message_id"]);

// PEGA TODOS OS PROJETOS QUE ESTÃO EM ANDAMENTO DE UMA VEZ

export let getProjectsOnce = function (filter = undefined) {
  return new Promise((resolve, reject) => {
    console.log("getProjectsOnce()");

    admin
      .database()
      .ref(endpoints.projects)
      .orderByChild("name")
      .once("value")
      .then((snapshot) => {
        let projects = snapshotToArray(snapshot.val()).sort(
          (item) => item.name
        );

        if (filter) {
          projects = projects.filter((project) =>
            project.name.toUpperCase().includes(filter.toUpperCase())
          );
        }

        return resolve(projects);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
