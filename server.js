const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Variáveis em memória (substitua por banco de dados real se preferir)
let comissaoGlobal = 10;
let lojas = [];
let clientes = [];
let produtos = [];

// 1. Clientes
app.post('/api/clientes/cadastrar', (req, res) => {
    const { nome, email, senha, tel, end } = req.body;
    if (clientes.some(c => c.email === email)) {
        return res.json({ sucesso: false, mensagem: 'E-mail já cadastrado!' });
    }
    clientes.push({ nome, email, senha, tel, end });
    res.json({ sucesso: true, mensagem: 'Cliente cadastrado com sucesso!' });
});

app.post('/api/clientes/login', (req, res) => {
    const { email, senha } = req.body;
    const cliente = clientes.find(c => c.email === email && c.senha === senha);
    if (!cliente) return res.json({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    res.json({ sucesso: true, usuario: { nome: cliente.nome, email: cliente.email } });
});

// 2. Lojas & Aprovação
app.post('/api/lojas/cadastrar', (req, res) => {
    const { nome, cnpj, tel, email, senha } = req.body;
    if (lojas.some(l => l.email === email)) {
        return res.json({ sucesso: false, mensagem: 'E-mail de loja já cadastrado!' });
    }
    lojas.push({ nome, cnpj, tel, email, senha, aprovada: false });
    res.json({ sucesso: true, mensagem: 'Loja cadastrada! Aguarde a aprovação do Administrador.' });
});

app.post('/api/lojas/login', (req, res) => {
    const { email, senha } = req.body;
    const loja = lojas.find(l => l.email === email && l.senha === senha);
    if (!loja) return res.json({ sucesso: false, mensagem: 'Credenciais inválidas.' });
    if (!loja.aprovada) return res.json({ sucesso: false, aprovada: false, mensagem: 'Loja pendente de aprovação.' });
    res.json({ sucesso: true, loja: { nome: loja.nome, email: loja.email, aprovada: loja.aprovada } });
});

// 3. Produtos
app.get('/api/produtos/todos', (req, res) => {
    // Retorna produtos apenas de lojas que estão Aprovadas
    const lojasAprovadas = lojas.filter(l => l.aprovada).map(l => l.email);
    const produtosFiltrados = produtos.filter(p => lojasAprovadas.includes(p.emailLoja)).map(p => {
        const lojaObj = lojas.find(l => l.email === p.emailLoja);
        return { ...p, lojaNome: lojaObj ? lojaObj.nome : 'Loja' };
    });
    res.json(produtosFiltrados);
});

app.get('/api/produtos/:emailLoja', (req, res) => {
    const { emailLoja } = req.params;
    const prods = produtos.filter(p => p.emailLoja === emailLoja);
    res.json(prods);
});

app.post('/api/produtos/adicionar', (req, res) => {
    const { emailLoja, nome, preco } = req.body;
    produtos.push({ emailLoja, nome, preco: parseFloat(preco) });
    res.json({ sucesso: true, mensagem: 'Produto adicionado!' });
});

// 4. Painel do Administrador Principal
app.get('/api/admin/dados', (req, res) => {
    res.json({
        comissao: comissaoGlobal,
        lojas: lojas.map(l => ({ nome: l.nome, email: l.email, aprovada: l.aprovada }))
    });
});

app.post('/api/admin/aprovar', (req, res) => {
    const { email } = req.body;
    const loja = lojas.find(l => l.email === email);
    if (loja) {
        loja.aprovada = true;
        return res.json({ sucesso: true, mensagem: 'Loja aprovada com sucesso!' });
    }
    res.json({ sucesso: false, mensagem: 'Loja não encontrada.' });
});

app.post('/api/admin/comissao', (req, res) => {
    const { comissao } = req.body;
    if (comissao !== undefined) {
        comissaoGlobal = parseFloat(comissao);
        return res.json({ sucesso: true, mensagem: 'Taxa de comissão atualizada!' });
    }
    res.json({ sucesso: false, mensagem: 'Valor inválido.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));