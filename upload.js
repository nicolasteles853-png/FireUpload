const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const API_KEY = "gcwIwwg7l6tVFnhVePXYTWY2TkRwGRPlk72p2H485b22c7c1";
const UPLOAD_DIR = path.join(__dirname, "uploads");

// cria pasta uploads se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sendJSON(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify(data));
}

http.createServer((req, res) => {

    if (req.method !== "POST") {
        return sendJSON(res, 405, { status: "ERROR", message: "Método não permitido" });
    }

    // API KEY
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== API_KEY) {
        return sendJSON(res, 401, { status: "ERROR", message: "API KEY inválida" });
    }

    const boundaryMatch = req.headers["content-type"]?.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
        return sendJSON(res, 400, { status: "ERROR", message: "Boundary não encontrado" });
    }

    const boundary = Buffer.from("--" + boundaryMatch[1]);
    let buffer = Buffer.alloc(0);

    req.on("data", chunk => {
        buffer = Buffer.concat([buffer, chunk]);
    });

    req.on("end", () => {
        const parts = buffer.split(boundary);

        for (const part of parts) {
            if (part.includes("Content-Disposition")) {
                const match = part.toString().match(/filename="(.+?)"/);
                if (!match) continue;

                const originalName = match[1];
                const ext = path.extname(originalName);
                const randomName = crypto.randomBytes(16).toString("hex") + ext;

                const start = part.indexOf("\r\n\r\n") + 4;
                const end = part.lastIndexOf("\r\n");

                const fileBuffer = part.slice(start, end);
                const savePath = path.join(UPLOAD_DIR, randomName);

                fs.writeFileSync(savePath, fileBuffer);

                const baseUrl = `https://${req.headers.host}`;
                const fileUrl = `${baseUrl}/uploads/${randomName}`;

                return sendJSON(res, 200, {
                    status: "OK",
                    url: fileUrl,
                    name: originalName,
                    type: ext.replace(".", "")
                });
            }
        }

        sendJSON(res, 400, { status: "ERROR", message: "Arquivo não encontrado" });
    });

}).listen(PORT, () => {
    console.log("🔥 FireUpload rodando na porta", PORT);
});

// polyfill Buffer.split
Buffer.prototype.split = function (sep) {
    let arr = [];
    let start = 0;
    let index;
    while ((index = this.indexOf(sep, start)) !== -1) {
        arr.push(this.slice(start, index));
        start = index + sep.length;
    }
    arr.push(this.slice(start));
    return arr;
};
