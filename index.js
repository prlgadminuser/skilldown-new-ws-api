"use strict";

const jwt = require("jsonwebtoken");
const Limiter = require("limiter").RateLimiter;
const bcrypt = require("bcrypt");
const Discord = require("discord.js");
module.exports = { jwt, Limiter, bcrypt, Discord };
const { startMongoDB, shopcollection } = require("./idbconfig");
var sanitize = require('mongo-sanitize');
const { RateLimiterMemory } = require('rate-limiter-flexible');
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
const { createRateLimiter, ConnectionOptionsRateLimit } = require("./limitconfig");

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


const server = http.createServer((req, res) => {
    // Setting security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'interest-cohort=()');

    // CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allowed HTTP methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allowed headers

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString(); // Collect request data
    });

    req.on('end', async () => {


        switch (req.url) {


            case '/register':
                if (req.method === 'POST') {
                    try {
                        const { username, password } = JSON.parse(body);
                        const response = await CreateAccount(username, password);


                        if (response) {
                            res.writeHead(200, { 'Content-Type': 'text/plain' });
                            return res.end(JSON.stringify({ data: response }));
                        } else {
                            res.writeHead(401, { 'Content-Type': 'text/plain' });
                            return res.end("Error: invalid types");
                        }
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        return res.end("Error: Internal server error during registration");
                    }
                }
                break;
                
            case '/login':
                if (req.method === 'POST') {
                    try {
                        const { username, password } = JSON.parse(body);
                        const response = await Login(username, password);

                        if (response) {
                            res.writeHead(201, { 'Content-Type': 'text/plain' });
                            return res.end(JSON.stringify({ data: response }));
                        } else {
                            res.writeHead(401, { 'Content-Type': 'text/plain' });
                            return res.end("Error: invalid types");
                        }
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        return res.end("Error: Internal server error during registration");
                    }
                }
                break;

            default:
                // Handle unknown routes
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                return res.end("Error: Not Found");
        }
    });
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
