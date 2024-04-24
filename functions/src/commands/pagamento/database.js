"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProjectById = exports.fetchProjects = void 0;
const { db } = require("../../aux/firebaseInit");
function fetchProjects() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbRef = db.ref("projects");
        try {
            const snapshot = yield dbRef.once("value");
            if (snapshot.exists()) {
                return snapshot.val();
            }
            else {
                console.log('Não existem dados no nó "projects".');
                return [];
            }
        }
        catch (error) {
            console.error("Erro ao buscar dados:", error);
            throw error;
        }
    });
}
exports.fetchProjects = fetchProjects;
function fetchProjectById(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbRef = db.ref("projects").child(projectId);
        try {
            const snapshot = yield dbRef.once("value");
            if (snapshot.exists()) {
                return snapshot.val();
            }
            else {
                console.log(`O projeto com o ID ${projectId} não foi encontrado.`);
                return null;
            }
        }
        catch (error) {
            console.error("Erro ao buscar dados:", error);
            throw error;
        }
    });
}
exports.fetchProjectById = fetchProjectById;
//# sourceMappingURL=database.js.map