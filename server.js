const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Inicialização do Firebase Admin (Certifique-se de configurar suas credenciais do Firebase Admin se necessário)
// Para testes rápidos, ele conecta à estrutura básica do Firestore
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault() // ou adicione suas credenciais do projeto
    });
}

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

let taxaComissaoGlobal = 10; // Taxa padrão de comissão (%)

// --- ROTAS DE PRODUTOS ---

// Pegar todos os produtos de todas as lojas
app.get('/api/produtos/todos', async (req, res) => {
    try {
        const lojasSnapshot = await db.collection('lojas').get();
        let todosProdutos = [];

        for (let lojaDoc of lojasSnapshot.docs) {
            const lojaData = lojaDoc.data();
            const produtosSnapshot = await db.collection('lojas').doc(lojaDoc.id).collection('produtos').get();
            
            produtosSnapshot.forEach(prodDoc => {
                todosProdutos.push({
                    id: prodDoc.id,
                    lojaEmail: lojaData.email,
                    lojaNome: lojaData.nome || 'Restaurante',
                    ...prodDoc.data()
                });
            });
        }
        res.json(todosProdutos);
    } catch (error) {
        // Fallback simulado caso o banco ainda esteja vazio ou configurando
        res.json([]);
    }
});

// Pegar produtos de uma loja específica
app.get('/api/produtos/:email', async (req, res) => {
    try {
        const emailLoja = req.params.email;
        const produtosSnapshot = await db.collection('lojas').doc(emailLoja).collection('produtos').get();
        let produtos = [];
        produtosSnapshot.forEach(doc => produtos.push({ id: doc.id, ...doc.data() }));
        res.json(produtos);
    } catch (error) {
        res.json([]);
    }
});

// Adicionar produto na loja
app.post('/api/produtos/adicionar', async (req, res) => {
    try {
        const { emailLoja, nome, preco } = req.body;
        await db.collection('lojas').doc(emailLoja).collection('produtos').add({
            nome,
            preco: parseFloat(preco),
            criadoEm: new Date().toISOString()
        });
        res.json({ sucesso: true, mensagem: 'Produto adicionado com sucesso!' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

// --- ROTAS DE CLIENTES ---

app.post('/api/clientes/cadastrar', async (req, res) => {
    try {
        const { nome, email, senha, tel, end } = req.body;
        await db.collection('clientes').doc(email).set({ nome, email, senha, tel, end });
        res.json({ sucesso: true, mensagem: 'Cliente cadastrado com sucesso!' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

app.post('/api/clientes/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const doc = await db.collection('clientes').doc(email).get();
        if (!doc.exists || doc.data().senha !== senha) {
            return res.json({ sucesso: false, mensagem: 'E-mail ou senha inválidos.' });
        }
        res.json({ sucesso: true, usuario: doc.data() });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

// --- ROTAS DE LOJAS ---

app.post('/api/lojas/cadastrar', async (req, res) => {
    try {
        const { nome, cnpj, tel, email, senha } = req.body;
        await db.collection('lojas').doc(email).set({
            nome, cnpj, tel, email, senha,
            aprovada: false // Lojas começam pendentes de aprovação pelo Admin
        });
        res.json({ sucesso: true, mensagem: 'Loja cadastrada! Aguarde a aprovação do Administrador.' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

app.post('/api/lojas/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const doc = await db.collection('lojas').doc(email).get();
        if (!doc.exists || doc.data().senha !== senha) {
            return res.json({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
        }
        const lojaData = doc.data();
        if (!lojaData.aprovada) {
            return res.json({ sucesso: false, aprovada: false, mensagem: 'Sua loja ainda está aguardando aprovação.' });
        }
        res.json({ sucesso: true, loja: lojaData });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

// --- ROTAS DO ADMINISTRADOR ---

app.get('/api/admin/dados', async (req, res) => {
    try {
        const lojasSnapshot = await db.collection('lojas').get();
        let lojas = [];
        lojasSnapshot.forEach(doc => lojas.push({ id: doc.id, ...doc.data() }));
        res.json({ comissao: taxaComissaoGlobal, lojas });
    } catch (error) {
        res.json({ comissao: taxaComissaoGlobal, lojas: [] });
    }
});

app.post('/api/admin/aprovar', async (req, res) => {
    try {
        const { email } = req.body;
        await db.collection('lojas').doc(email).update({ aprovada: true });
        res.json({ sucesso: true, mensagem: 'Loja aprovada com sucesso!' });
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: error.message });
    }
});

app.post('/api/admin/comissao', (req, res) => {
    const { comissao } = req.body;
    taxaComissaoGlobal = comissao;
    res.json({ sucesso: true, mensagem: 'Taxa de comissão atualizada com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
