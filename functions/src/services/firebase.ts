import * as admin from "firebase-admin";

export async function getCoordinatorsId(): Promise<string[]> {
  try {
    const snapshot = await admin
      .database()
      .ref("/configuration/coordinators")
      .once("value");
    return snapshot.val() || [];
  } catch (err) {
    console.error("Erro ao buscar coordenadores:", err);
    return [];
  }
}

export async function getFinancesGroupId(): Promise<string> {
  try {
    const snapshot = await admin
      .database()
      .ref("/configuration/financesgroup")
      .once("value");
    return snapshot.val() || "";
  } catch (err) {
    console.error("Erro ao buscar ID do grupo financeiro:", err);
    return "";
  }
}
