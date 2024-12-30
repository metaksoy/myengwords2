require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// CORS ayarları
app.use(cors({
    origin: [
        'https://metgame.netlify.app',
        'https://metgames1.netlify.app',  
        'https://myengwords-production.up.railway.app',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://localhost:5501',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:5501'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));

// PostgreSQL bağlantı havuzu
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Veritabanı tablosunu oluştur
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        
        // Tablo oluştur
        await client.query(`
            CREATE TABLE IF NOT EXISTS words (
                id SERIAL PRIMARY KEY,
                eng TEXT NOT NULL,
                tr TEXT NOT NULL,
                level TEXT NOT NULL
            )
        `);

        // Örnek verileri ekle (sadece tablo boşsa)
        const checkData = await client.query('SELECT COUNT(*) FROM words');
        if (parseInt(checkData.rows[0].count) === 0) {
            const initialWords = [
                { eng: 'hello', tr: 'merhaba', level: 'A1' },
                { eng: 'good morning', tr: 'günaydın', level: 'A1' },
                { eng: 'thank you', tr: 'teşekkür ederim', level: 'A1' }
                // Daha fazla kelime ekleyebilirsiniz
            ];

            for (const word of initialWords) {
                await client.query(
                    'INSERT INTO words (eng, tr, level) VALUES ($1, $2, $3)',
                    [word.eng, word.tr, word.level]
                );
            }
        }

        client.release();
        console.log('Veritabanı başarıyla başlatıldı');
    } catch (err) {
        console.error('Veritabanı başlatma hatası:', err);
    }
}

// API endpoints
app.get('/api/words', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM words');
        res.json(result.rows);
    } catch (err) {
        console.error('Veritabanı sorgu hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/words/:level', async (req, res) => {
    try {
        const { level } = req.params;
        const result = await pool.query('SELECT * FROM words WHERE level = $1', [level]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/words', async (req, res) => {
    try {
        const { eng, tr, level } = req.body;
        const result = await pool.query(
            'INSERT INTO words (eng, tr, level) VALUES ($1, $2, $3) RETURNING id',
            [eng, tr, level]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Veritabanını başlat ve sunucuyu çalıştır
initializeDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
    });
});

// PostgreSQL bağlantı testi
pool.connect((err, client, done) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err);
    } else {
        console.log('PostgreSQL veritabanına başarıyla bağlanıldı');
        done();
    }
}); 