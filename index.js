"use strict";

const jwt = require("jsonwebtoken");
const Limiter = require("limiter").RateLimiter;
const bcrypt = require("bcrypt");
const Discord = require("discord.js");
const { RateLimiterMemory } = require('rate-limiter-flexible');
module.exports = { jwt, Limiter, bcrypt, Discord, RateLimiterMemory };
const { startMongoDB, shopcollection } = require("./idbconfig");
var sanitize = require('mongo-sanitize');
const WebSocket = require("ws");
const http = require('http');
const LZString = require("lz-string");
const { verifyPlayer } = require('./routes/verifyPlayer');
const { getUserInventory } = require('./routes/getinventory');
const { updateNickname } = require('./routes/updatename');
const { getshopdata } = require('./routes/getShopData');
const { equipItem } = require('./routes/equipitem');
const { equipColor } = require("./routes/equipcolor");
const { getdailyreward } = require('./routes/dailyreward');
const { buyItem } = require('./routes/buyitem');
const { buyRarityBox } = require('./routes/buyraritybox');
const { getUserProfile } = require('./routes/getprofile');
const { setupHighscores, gethighscores } = require('./routes/leaderboard');
const { createRateLimiter, ConnectionOptionsRateLimit, apiRateLimiter, AccountRateLimiter } = require("./limitconfig");

const { CreateAccount } = require('./accounthandler/register');
const { Login } = require('./accounthandler/login');

const connectedPlayers = new Map();
const playerQueue = new Map();
let maintenanceMode = false;

const allowedOrigins = [
    "https://slcount.netlify.app",
    "https://slgame.netlify.app",
    "https://serve.gamejolt.net",
    "http://serve.gamejolt.net",
    "tw-editor://.",
    "https://html-classic.itch.zone",
    "null",
    "https://turbowarp.org",
    "https://liquemgames.itch.io/sr",
    "https://s-r.netlify.app",
    "https://uploads.ungrounded.net",
    "https://prod-dpgames.crazygames.com",
    "https://crazygames.com",
    "https://crazygames.com/game/skilled-royale",
    "https://s-ri0p-delgae.netlify.app",
];

const pingInterval = 10000; // 10 seconds for ping-pong check
const maxClients = 20;
let connectedClientsCount = 0;


const server = http.createServer(async (req, res) => {
    try {
        // Handle Rate Limiting - Ensure It Stops Execution on Failure
        try {
            await apiRateLimiter.consume(req.headers['x-forwarded-for']?.split(',')[0]);
        } catch {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            return res.end("Too many requests. Try again later");
        }

        // Security Headers
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "no-referrer");
        res.setHeader("Permissions-Policy", "interest-cohort=()");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                let requestData = {};
                if (body) {
                    try {
                        requestData = JSON.parse(body);
                    } catch (err) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        return res.end("Error: Invalid JSON");
                    }
                }

                switch (req.url) {
                    case '/register':
                        if (req.method !== 'POST') break;

                        if (!requestData.username || !requestData.password) {
                            res.writeHead(400, { 'Content-Type': 'text/plain' });
                            return res.end("Error: Missing username or password");
                        }


                        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
                        // Apply Rate Limiting Before Processing
                        const rateLimitData = await AccountRateLimiter.get(ip);

                        if (rateLimitData && rateLimitData.remainingPoints <= 0) {
                            res.writeHead(429, { 'Content-Type': 'text/plain' });
                            return res.end("You cant create more accounts.");
                        }


                        const response = await CreateAccount(requestData.username, requestData.password);
                        if (response?.token) {
                            AccountRateLimiter.consume(ip);
                            res.writeHead(201, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ data: response }));
                        } else {
                            res.writeHead(400, { 'Content-Type': 'text/plain' });
                            return res.end("Error: Invalid account creation");
                        }
                        break;

                    case '/login':
                        if (req.method !== 'POST') break;

                        if (!requestData.username || !requestData.password) {
                            res.writeHead(400, { 'Content-Type': 'text/plain' });
                            return res.end("Error: Missing username or password");
                        }

                        const loginResponse = await Login(requestData.username, requestData.password);
                        if (loginResponse) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ data: loginResponse }));
                        } else {
                            res.writeHead(401, { 'Content-Type': 'text/plain' });
                            return res.end("Error: Invalid credentials");
                        }
                        break;

                    default:
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        return res.end("Error: Not Found");
                }
            } catch (err) {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                }
                return res.end("Error: Internal server error");
            }
        });
    } catch (err) {
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end("Error: Internal server error");
    }
});








const wss = new WebSocket.Server({
    noServer: true,
    clientTracking: false,
    perMessageDeflate: false,
    proxy: true,
    maxPayload: 80, // 10MB max payload
});

// Function to escape special characters in strings (for MongoDB safety)
function escapeStringForMongo(input) {
    return String(input).replace(/[§.]/g, '');
}

async function handleMessage(ws, message, playerVerified) {
    try {
        const escapedMessage = escapeInput(message.toString());
        const data = JSON.parse(escapedMessage);

        let response;

        switch (data.id) {
            case "ping":
                ws.playerVerified.lastPongTime = Date.now();
                break;

            case "equip_item":
                response = await equipItem(playerVerified.playerId, data.type, data.itemid);
                ws.send(JSON.stringify({ type: "equipitem", data: response }));
                break;

            case "equip_color":
                response = await equipColor(playerVerified.playerId, data.type, data.color);
                ws.send(JSON.stringify({ type: "equipcolor", data: response }));
                break;

            case "dailyreward":
                response = await getdailyreward(playerVerified.playerId);
                ws.send(JSON.stringify({ type: "dailyreward", data: response }));
                break;

            case "change_name":
                response = await updateNickname(playerVerified.playerId, data.new);
                ws.send(JSON.stringify({ type: "nickname", data: response }));
                break;

            case "shopdata":
                response = await getshopdata();
                ws.send(JSON.stringify({ type: "shopdata", data: response }));
                break;

            case "buyitem":
                response = await buyItem(playerVerified.playerId, data.buyid);
                ws.send(JSON.stringify({ type: "buyitem", data: response }));
                break;

            case "profile":
                response = await getUserProfile(data.pid);
                ws.send(JSON.stringify({ type: "profile", data: response }));
                break;

            case "openbox":
                response = await buyRarityBox(playerVerified.playerId);
                ws.send(JSON.stringify({ type: "openbox", data: response }));
                break;

            case "highscore":
                response = await gethighscores();
                ws.send(JSON.stringify({ type: "highscores", data: response }));
                break;

            default:
                ws.close(1007, "error");
                break;
        }
    } catch (error) {
        ws.close(1007, "error");
    }
}

function escapeInput(input) {
    if (input === null || input === undefined) return '';
    if (typeof input === 'object') {
        return JSON.stringify(input, (key, value) => {
            if (typeof value === 'string') {
                return value.replace(/[$.]/g, '');
            }
            return value;
        });
    }
    return String(input).replace(/[$.]/g, '');
}

const rateLimiterConnection = new RateLimiterMemory(ConnectionOptionsRateLimit);

wss.on("connection", (ws, req) => {
    if (maintenanceMode) {
        ws.close(4000, "maintenance");
        return;
    }

    console.log("Client connected");

    const playerVerified = ws.playerVerified;
    playerVerified.lastPongTime = Date.now();
    playerVerified.rateLimiter = createRateLimiter();

    ws.send(JSON.stringify({ type: "connection_success", accdata: playerVerified.inventory }));

    const pingIntervalId = setInterval(() => {
        if (ws && playerVerified.lastPongTime > Date.now() - pingInterval) {
        } else {
            ws.close(3845, "activity timeout");
        }
    }, pingInterval);

    ws.on("message", async (message) => {
        try {
            if (!playerVerified.rateLimiter.tryRemoveTokens(1)) {
                ws.close(1007);
                return;
            }

            await handleMessage(ws, message, playerVerified);
        } catch (error) {
            ws.close(1007, "error");
        }
    });

    ws.on("error", (error) => {
        if (error.message.includes('payload size')) {
            console.error('Payload size exceeded:', error.message);
            ws.close(1009, "Payload size exceeded");
        } else {
            console.error('WebSocket error:', error);
        }
    });

    ws.on("close", () => {
        clearInterval(pingIntervalId);

        const playerId = ws.playerVerified?.playerId;

        if (playerId) {
            connectedPlayers.delete(playerId);
            connectedClientsCount--;

            if (playerQueue.has(playerId)) {
                playerQueue.delete(playerId);
                console.log(`Player ${playerId} removed from queue due to disconnection.`);
            }
        }
    });
});


server.on("upgrade", async (request, socket, head) => {
    try {
        const ip = request.socket.remoteAddress;

        if (!ip) return;

        await rateLimiterConnection.consume(ip);

        if (connectedClientsCount >= maxClients) {
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
            socket.destroy();
            return;
        }

        const origin = request.headers.origin;
        if (!allowedOrigins.includes(origin)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        const token = request.url.split('/')[1].replace(/\$/g, '');

        try {
            const playerVerified = await verifyPlayer(token);

            const existingConnection = connectedPlayers.get(playerVerified.playerId);
            if (existingConnection) {
                existingConnection.close(1001, "Reassigned connection");
                await new Promise(resolve => existingConnection.on('close', resolve));
                connectedPlayers.delete(playerVerified.playerId);
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.playerVerified = playerVerified;
                connectedPlayers.set(playerVerified.playerId, ws);
                connectedClientsCount++;
                wss.emit("connection", ws, request);
            });
        } catch (error) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    } catch (error) {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
    }
});

const PORT = process.env.PORT || 3090;

startMongoDB().then(() => {
    server.listen(PORT, () => {
        console.log(`WebSocket server is listening on port ${PORT}`);
    });
});

function watchItemShop() {
    const pipeline = [{ $match: { "fullDocument._id": { $in: ["dailyItems", "maintenance"] }, operationType: "update" } }];
    let changeStream;

    const startChangeStream = () => {
        changeStream = shopcollection.watch(pipeline, { fullDocument: "updateLookup" });

        changeStream.on("change", (change) => {
            const docId = change.fullDocument._id;
            if (docId === "dailyItems") {
                broadcast("shopupdate");
            } else if (docId === "maintenance") {
                maintenanceMode = change.fullDocument.status === "true";
                broadcast("maintenanceupdate");
                if (maintenanceMode) closeAllClients(4001, "maintenance");
            }
        });

        changeStream.on("error", (err) => {
            console.error("Change stream error:", err);
            setTimeout(startChangeStream, 5000); // Retry after delay
        });
    };

    startChangeStream();
}

// Example usage: 
watchItemShop();

setupHighscores();

process.on("SIGINT", () => {
    changeStream.close();
    console.log("Change stream closed on SIGINT");
    process.exit();
});

function broadcast(message) {
    const msg = JSON.stringify({ update: message });
    connectedPlayers.forEach((ws) => ws.readyState === WebSocket.OPEN && ws.send(msg));
}

function closeAllClients(code, reason) {
    connectedPlayers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(code, reason);
        }
    });
}