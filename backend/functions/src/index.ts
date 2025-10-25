import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import serviceAccount from "../serviceAccountKey.json";
import haversine from "haversine-distance";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

interface EcopontoData {
  id?: string;
  title: string;
  latitude: number;
  longitude: number;
  materials: string[];
  createdAt?: admin.firestore.Timestamp | admin.firestore.FieldValue;
}

interface EcopontoComDistancia extends EcopontoData {
  distance: number;
}


app.get("/ecopontos", async (req: express.Request,
  res: express.Response) => {
  try {
    const snapshot = await db.collection("ecopontos")
      .orderBy("createdAt", "desc")
      .get();
    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    const ecopontos: EcopontoData[] = [];
    snapshot.forEach((doc) => {
      ecopontos.push({ id: doc.id, ...doc.data() } as EcopontoData);
    });
    return res.status(200).json(ecopontos);
  } catch (error) {
    console.error("Erro ao buscar do Firestore:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.get("/ecopontos/perto", async (req: express.Request,
  res: express.Response) => {
  try {
    const latStr = req.query.lat as string;
    const lonStr = req.query.lon as string;
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
    const ecopontosComDistancia: EcopontoComDistancia[] = [];
    snapshot.forEach((doc) => {
      const ecoponto = { id: doc.id, ...doc.data() } as EcopontoData;
      if (typeof ecoponto.latitude === "number" &&
        typeof ecoponto.longitude === "number") {
        const pointLocation = {
          latitude: ecoponto.latitude,
          longitude: ecoponto.longitude,
        };
        const distanceInKm = haversine(userLocation, pointLocation) / 1000;
        ecopontosComDistancia.push({
          ...ecoponto,
          distance: distanceInKm,
        });
      } else {
        console.warn(`Ecoponto ${ecoponto.id} ignorado (coords inválidas).`);
      }
    });
    ecopontosComDistancia.sort((a, b) => a.distance - b.distance);
    return res.status(200).json(ecopontosComDistancia);
  } catch (error) {
    console.error("Erro ao buscar pontos próximos:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.post("/ecopontos", async (req: express.Request,
  res: express.Response) => {
  try {
    const { title, latitude, longitude, materials } = req.body;
    if (!title || latitude === undefined || longitude === undefined ||
      !materials) {
      return res.status(400).json({ error: "Dados incompletos." });
    }
    const newEcoponto: EcopontoData = {
      title,
      latitude,
      longitude,
      materials,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("ecopontos").add(newEcoponto);
    const { createdAt, ...returnData } = newEcoponto;
    return res.status(201).json({ id: docRef.id, ...returnData });
  } catch (error) {
    console.error("Erro ao inserir no Firestore:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.put("/ecopontos/:id", async (req: express.Request,
  res: express.Response) => {
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
    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Erro ao atualizar no Firestore:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.delete("/ecopontos/:id", async (req: express.Request,
  res: express.Response) => {
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
  } catch (error) {
    console.error("Erro ao deletar do Firestore:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

export const api = functions.https.onRequest(app);
