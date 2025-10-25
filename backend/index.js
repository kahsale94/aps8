const express = require('express');
const admin = require('firebase-admin');
const haversine = require('haversine-distance');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const PORT = 3000;
app.use(express.json());


app.get('/ecopontos', async (req, res) => {
    try {
        const ecopontosRef = db.collection('ecopontos');
        const snapshot = await ecopontosRef.get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }
        const ecopontos = [];
        snapshot.forEach(doc => {
            ecopontos.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(ecopontos);
    } catch (error) {
        console.error('Erro ao buscar do Firestore:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.get('/ecopontos/perto', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude e Longitude são obrigatórias.' });
        }

        const userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon) };

        const ecopontosRef = db.collection('ecopontos');
        const snapshot = await ecopontosRef.get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const ecopontosComDistancia = [];
        snapshot.forEach(doc => {
            const ecoponto = { id: doc.id, ...doc.data() };
            const pointLocation = { latitude: ecoponto.latitude, longitude: ecoponto.longitude };

            const distanceInKm = haversine(userLocation, pointLocation) / 1000;

            ecopontosComDistancia.push({ ...ecoponto, distance: distanceInKm });
        });

        ecopontosComDistancia.sort((a, b) => a.distance - b.distance);

        res.status(200).json(ecopontosComDistancia);
    } catch (error) {
        console.error('Erro ao buscar pontos próximos:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.post('/ecopontos', async (req, res) => {
    try {
        const { title, latitude, longitude, materials } = req.body;
        if (!title || latitude === undefined || longitude === undefined || !materials) {
            return res.status(400).json({ error: 'Dados incompletos.' });
        }
        const newEcoponto = { title, latitude, longitude, materials, createdAt: new Date() };
        const docRef = await db.collection('ecopontos').add(newEcoponto);
        res.status(201).json({ id: docRef.id, ...newEcoponto });
    } catch (error) {
        console.error('Erro ao inserir no Firestore:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.put('/ecopontos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, materials } = req.body;
        if (!title || !materials) {
            return res.status(400).json({ error: 'Título e materiais são obrigatórios.' });
        }
        const ecopontoRef = db.collection('ecopontos').doc(id);
        await ecopontoRef.update({ title, materials });
        const doc = await ecopontoRef.get();
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Erro ao atualizar no Firestore:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.delete('/ecopontos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('ecopontos').doc(id).delete();
        res.status(200).json({ message: 'Ponto de coleta deletado com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar do Firestore:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

app.listen(PORT, () => {
    console.log(`📡 Servidor rodando na porta ${PORT}`);
});