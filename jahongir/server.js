const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require("util");

const PORT = process.env.PORT || 3000;
const publicDirectory = __dirname;
const dataDirectory = path.join(__dirname, "data");
const usersFile = path.join(dataDirectory, "users.json");
const scrypt = promisify(crypto.scrypt);

function ensureUsersFile() {
    fs.mkdirSync(dataDirectory, { recursive: true });

    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, "[]", "utf8");
    }
}

function readUsers() {
    ensureUsersFile();
    return JSON.parse(fs.readFileSync(usersFile, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf8");
}

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(data));
}

function getPublicUsers(users) {
    return users.map(({ id, name, email, createdAt }) => ({
        id,
        name,
        email,
        createdAt
    }));
}

async function registerUser(request, response) {
    let body = "";

    request.on("data", (chunk) => {
        body += chunk;

        if (body.length > 10000) {
            request.destroy();
        }
    });

    request.on("end", async () => {
        try {
            const { name, email, password } = JSON.parse(body);
            const cleanName = String(name || "").trim();
            const cleanEmail = String(email || "").trim().toLowerCase();

            if (!cleanName || !cleanEmail || !password) {
                sendJson(response, 400, { message: "Barcha maydonlarni to‘ldiring." });
                return;
            }

            if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
                sendJson(response, 400, { message: "Email manzili noto‘g‘ri." });
                return;
            }

            if (String(password).length < 6) {
                sendJson(response, 400, { message: "Parol kamida 6 ta belgidan iborat bo‘lsin." });
                return;
            }

            const users = readUsers();
            if (users.some((user) => user.email === cleanEmail)) {
                sendJson(response, 409, { message: "Bu email allaqachon ro‘yxatdan o‘tgan." });
                return;
            }

            const salt = crypto.randomBytes(16).toString("hex");
            const derivedKey = await scrypt(String(password), salt, 64);
            const newUser = {
                id: crypto.randomUUID(),
                name: cleanName,
                email: cleanEmail,
                passwordHash: `${salt}:${derivedKey.toString("hex")}`,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            saveUsers(users);
            sendJson(response, 201, {
                message: "Ro‘yxatdan muvaffaqiyatli o‘tildi.",
                users: getPublicUsers(users)
            });
        } catch {
            sendJson(response, 400, { message: "Yuborilgan ma’lumotlarni o‘qib bo‘lmadi." });
        }
    });
}

function serveFile(request, response) {
    const requestedPath = request.url === "/" ? "/index.html" : request.url;
    const filePath = path.normalize(path.join(publicDirectory, requestedPath));

    if (!filePath.startsWith(publicDirectory) || !fs.existsSync(filePath)) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Sahifa topilmadi");
        return;
    }

    const extension = path.extname(filePath);
    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8"
    };

    response.writeHead(200, {
        "Content-Type": contentTypes[extension] || "application/octet-stream"
    });
    fs.createReadStream(filePath).pipe(response);
}

ensureUsersFile();

const server = http.createServer((request, response) => {
    if (request.method === "GET" && request.url === "/api/users") {
        sendJson(response, 200, { users: getPublicUsers(readUsers()) });
        return;
    }

    if (request.method === "POST" && request.url === "/api/register") {
        registerUser(request, response);
        return;
    }

    if (request.method === "GET") {
        serveFile(request, response);
        return;
    }

    sendJson(response, 405, { message: "Bu amal qo‘llab-quvvatlanmaydi." });
});

server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} manzilida ishga tushdi`);
});
