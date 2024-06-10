const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const { jsPDF } = require('jspdf');
const crypto = require('crypto'); // Importa a biblioteca de criptografia
const fs = require('fs');
const app = express();
const port = 3000;

// Carregar a fonte Roboto em Base64
const robotoFont = fs.readFileSync(path.join(__dirname, 'Roboto-Regular.ttf'), 'base64');

// Conexão com o banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: '',
    password: '',
    database: 'emprestimos'
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL');
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Função para criptografar senhas
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Função para formatar datas para o formato dd/mm/yyyy
const formatDate = (date) => {
    const d = new Date(date);
    let day = `${d.getDate()}`;
    let month = `${d.getMonth() + 1}`;
    const year = d.getFullYear();

    if (day.length < 2) day = `0${day}`;
    if (month.length < 2) month = `0${month}`;

    return `${day}/${month}/${year}`;
};

// Função para converter datas do formato dd/mm/yyyy para yyyy-mm-dd
const parseDate = (date) => {
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day}`;
};

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = hashPassword(password);
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(sql, [username, hashedPassword], (err, results) => {
        if (err) {
            console.error('Erro ao consultar banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }
        if (results.length > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    });
});

// Listar materiais
app.get('/materials', (req, res) => {
    const { status } = req.query;
    const sql = 'SELECT * FROM materials WHERE status = ?';
    db.query(sql, [status], (err, results) => {
        if (err) {
            console.error('Erro ao consultar banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }
        const formattedResults = results.map(material => ({
            ...material,
            start_date: material.start_date ? formatDate(material.start_date) : null,
            end_date: material.end_date ? formatDate(material.end_date) : null,
        }));
        res.json(formattedResults);
    });
});

// Adicionar material
app.post('/materials', (req, res) => {
    const { name } = req.body;
    const sql = 'INSERT INTO materials (name) VALUES (?)';
    db.query(sql, [name], (err, results) => {
        if (err) {
            console.error('Erro ao inserir no banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }
        res.json({ success: true });
    });
});

// Editar material
app.put('/materials/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const sql = 'UPDATE materials SET name = ? WHERE id = ?';
    db.query(sql, [name, id], (err, results) => {
        if (err) {
            console.error('Erro ao atualizar banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }
        res.json({ success: true });
    });
});

// Deletar material
app.delete('/materials/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM materials WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Erro ao deletar do banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }
        res.json({ success: true });
    });
});

// Emprestar material
app.put('/materials/:id/borrow', (req, res) => {
    const { id } = req.params;
    const { borrower, start_date, end_date } = req.body;
    const sql = 'UPDATE materials SET borrower = ?, start_date = ?, end_date = ?, status = "emprestado" WHERE id = ?';
    db.query(sql, [borrower, parseDate(start_date), parseDate(end_date), id], (err, results) => {
        if (err) {
            console.error('Erro ao atualizar banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }
        res.json({ success: true });
    });
});

// Devolver material
app.put('/materials/:id/return', (req, res) => {
    const { id } = req.params;
    const sql = 'UPDATE materials SET borrower = NULL, start_date = NULL, end_date = NULL, status = "disponivel" WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Erro ao atualizar banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }
        res.json({ success: true });
    });
});

// Gerar PDF para item específico
app.get('/generate-item-pdf/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM materials WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Erro ao consultar banco de dados:', err);
            res.status(500).json({ success: false, message: 'Erro no servidor' });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ success: false, message: 'Material não encontrado' });
            return;
        }

        const material = results[0];
        const startDate = material.start_date ? formatDate(material.start_date) : 'N/A';
        const endDate = material.end_date ? formatDate(material.end_date) : 'N/A';

        const doc = new jsPDF('p', 'mm', 'a4');
        doc.addFileToVFS('Roboto-Regular.ttf', robotoFont);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto');
        doc.setFontSize(12);
        const text = `\n\n
        TERMO DE EMPRÉSTIMO DE EQUIPAMENTOS\n\n
        Eu, ${material.borrower}, declaro que recebi a título de empréstimo, nesta data,\n o equipamento abaixo relacionado, que pertencem ao setor: :\n\n
        Item: ${material.name}\n\n
        Data Inicial: ${startDate}\n
        Data Final: ${endDate}\n\n
        ___________________________________________________________
                                 (Assinatura)\n\n
        No ato da devolução:
        ( ) Equipamento devolvido corretamente.
        ( ) Devolvido com atraso de ____________.
        ( ) Equipamento devolvido com defeito ou faltando item.
        ( ) Extravio de equipamento.\n\n
        --------------Entregue ao usuário----------\n\n
        Eu, ${material.borrower}, declaro que recebi o equipamento sem defeito:
        Item: ${material.name}\n\n
        Devolvi em ____/____/_______.\n\n        
        Software gerado por GPT4 - Dk v.1.0©`;
        doc.text(text, 10, 10);

        const pdfOutput = doc.output();
        res.type('application/pdf');
        res.send(pdfOutput);
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
