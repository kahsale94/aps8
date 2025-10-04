const express = require('express');
const { Pool } = require('pg');

// Configuração do App Express
const app = express();
const PORT = 3000;

// Configuração da Conexão com o Banco de Dados
const pool = new Pool({
    user: 'docker',
    host: '127.0.0.1', // << MUDANÇA IMPORTANTE AQUI
    database: 'ecoponto',
    password: 'docker',
    port: 5432,
});

// Função para testar a conexão com o banco
async function testDbConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso!');
        const res = await client.query('SELECT NOW()');
        console.log('🕒 Horário atual do banco:', res.rows[0].now);
        client.release();
    } catch (error) {
        console.error('❌ Erro ao conectar com o PostgreSQL:', error.message);
    }
}

// Rota principal de teste
app.get('/', (req, res) => {
    res.send('Backend EcoPonto no ar! 🚀');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`📡 Servidor rodando na porta ${PORT}`);
    testDbConnection(); // Testa a conexão com o banco ao iniciar
});