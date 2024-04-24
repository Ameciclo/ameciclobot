const { db } = require("../../aux/firebaseInit");

export async function fetchProjects() {
  const dbRef = db.ref("projects");
  try {
    const snapshot = await dbRef.once("value");
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log('Não existem dados no nó "projects".');
      return [];
    }
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    throw error;
  }
}

export async function fetchProjectById(projectId) {
  const dbRef = db.ref("projects").child(projectId);
  try {
    const snapshot = await dbRef.once("value");
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log(`O projeto com o ID ${projectId} não foi encontrado.`);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    throw error;
  }
}
