const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
const BLOCKED_EXT = ["php","phtml","phar","sh","exe","bat","js","cgi","pl"];
const API_KEY = "33c0c284315e538a5c166a8d0ccda4ccaeb360a14d4fc11094535e091e5e0664";

// Cria pasta uploads se não existir
const uploadBase = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadBase)) fs.mkdirSync(uploadBase, { recursive: true });

// Configuração do multer (armazenamento dinâmico por UID)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uid = uuidv4();
    const dir = path.join(uploadBase, uid);
    fs.mkdirSync(dir, { recursive: true });
    req.uploadDir = dir;  // salva o diretório pra depois
    req.uid = uid;        // salva UID
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    let originalName = file.originalname.replace(/[^A-Za-z0-9._-]/g, "_");
    const ext = path.extname(originalName).toLowerCase().replace(".", "");
    if (BLOCKED_EXT.includes(ext)) {
      return cb(new Error("Tipo de arquivo não permitido"));
    }
    cb(null, originalName);
  }
});

const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_SIZE } });

// Middleware para checar API Key
app.use((req, res, next) => {
  if (req.method !== "POST") return res.status(400).json({ status: "error", message: "Método inválido" });
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) return res.status(403).json({ status: "error", message: "Chave de API inválida" });
  next();
});

// Endpoint de upload
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ status: "error", message: "Nenhum arquivo enviado" });

    const filePath = path.join(req.uploadDir, req.file.filename);
    const stats = fs.statSync(filePath);
    const mimeType = mime.lookup(filePath) || "application/octet-stream";

    const protocol = req.protocol;
    const host = req.get("host");
    const url = `${protocol}://${host}/uploads/${req.uid}/${req.file.filename}`;

    res.json({
      status: "OK",
      nome: req.file.originalname,
      "file-type": path.extname(req.file.originalname).slice(1),
      mime: mimeType,
      size_bytes: stats.size,
      size_kb: +(stats.size / 1024).toFixed(2),
      size_mb: +(stats.size / 1024 / 1024).toFixed(2),
      url: url,
      uid: req.uid
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Rota teste
app.get("/", (req, res) => res.send("API FireUpload rodando!"));

// Start server
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
