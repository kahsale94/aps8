"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const serviceAccountKey_json_1 = __importDefault(require("../serviceAccountKey.json"));
const haversine_distance_1 = __importDefault(require("haversine-distance"));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey_json_1.default),
    });
}
const db = admin.firestore();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
app.get("/ecopontos", async (req, res) => {
    try {
        const snapshot = await db.collection("ecopontos")
            .orderBy("createdAt", "desc")
            .get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        const ecopontos = [];
        snapshot.forEach((doc) => {
            ecopontos.push(Object.assign({ id: doc.id }, doc.data()));
        });
        return res.status(200).json(ecopontos);
    }
    catch (error) {
        console.error("Erro ao buscar do Firestore:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});
app.get("/ecopontos/perto", async (req, res) => {
    try {
        const latStr = req.query.lat;
        const lonStr = req.query.lon;
        if (!latStr || !lonStr) {
            return res.status(400)
                .json({ error: "Latitude e Longitude são obrigatórias." });
        }
        const userLocation = {
            latitude: parseFloat(latStr),
            longitude: parseFloat(lonStr),
        };
        const snapshot = await db.collection("ecopontos").get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        const ecopontosComDistancia = [];
        snapshot.forEach((doc) => {
            const ecoponto = Object.assign({ id: doc.id }, doc.data());
            if (typeof ecoponto.latitude === "number" &&
                typeof ecoponto.longitude === "number") {
                const pointLocation = {
                    latitude: ecoponto.latitude,
                    longitude: ecoponto.longitude,
                };
                const distanceInKm = (0, haversine_distance_1.default)(userLocation, pointLocation) / 1000;
                ecopontosComDistancia.push(Object.assign(Object.assign({}, ecoponto), { distance: distanceInKm }));
            }
            else {
                console.warn(`Ecoponto ${ecoponto.id} ignorado (coords inválidas).`);
            }
        });
        ecopontosComDistancia.sort((a, b) => a.distance - b.distance);
        return res.status(200).json(ecopontosComDistancia);
    }
    catch (error) {
        console.error("Erro ao buscar pontos próximos:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});
app.post("/ecopontos", async (req, res) => {
    try {
        const { title, latitude, longitude, materials } = req.body;
        if (!title || latitude === undefined || longitude === undefined ||
            !materials) {
            return res.status(400).json({ error: "Dados incompletos." });
        }
        const newEcoponto = {
            title,
            latitude,
            longitude,
            materials,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection("ecopontos").add(newEcoponto);
        const { createdAt } = newEcoponto, returnData = __rest(newEcoponto, ["createdAt"]);
        return res.status(201).json(Object.assign({ id: docRef.id }, returnData));
    }
    catch (error) {
        console.error("Erro ao inserir no Firestore:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});
app.put("/ecopontos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, materials } = req.body;
        if (!title || !materials) {
            return res.status(400)
                .json({ error: "Título e materiais são obrigatórios." });
        }
        const ecopontoRef = db.collection("ecopontos").doc(id);
        await ecopontoRef.update({ title, materials });
        const doc = await ecopontoRef.get();
        if (!doc.exists) {
            return res.status(404)
                .json({ error: "Ponto não encontrado após atualização." });
        }
        return res.status(200).json(Object.assign({ id: doc.id }, doc.data()));
    }
    catch (error) {
        console.error("Erro ao atualizar no Firestore:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});
app.delete("/ecopontos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection("ecopontos").doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404)
                .json({ error: "Ponto não encontrado para deletar." });
        }
        await docRef.delete();
        return res.status(200)
            .json({ message: "Ponto de coleta deletado com sucesso." });
    }
    catch (error) {
        console.error("Erro ao deletar do Firestore:", error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map