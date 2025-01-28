"use strict";

const jwt = require("jsonwebtoken");
const Limiter = require("limiter").RateLimiter;
module.exports = { jwt, Limiter };
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

const connectedPlayers = new Map();
const playerQueue = new Map();

let maintenanceMode = false

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
    // Set security headers
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'interest-cohort=()');
  
    // Handle request and send a response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('qs\n');
});

const wss = new WebSocket.Server({
    noServer: true,
    clientTracking: false,
    perMessageDeflate: false,
    proxy: true,
    maxPayload: 100
    , // 10MB max payload
});


// Function to escape special characters in strings (for MongoDB safety)
function escapeStringForMongo(input) {

        const input1 = String(input);

    // Escape characters that could interfere with MongoDB queries
    return input1.replace(/[§.]/g, '');
}


function containsChar(input, char) {
    // Convert both the input and the character to string
    const text = String(input);
    const escapedChar = escapeStringForMongo(char); // Escape the character before use
    return text.includes(escapedChar);
}

function containsCharInObject(obj, char) {
    // Convert the character to string and escape it
    const escapedChar = escapeStringForMongo(char);
    
    // Convert the object to string representation and check for the character
    if (typeof obj === 'string') {
        return containsChar(obj, escapedChar);
    }

    // Handle arrays: Check each item recursively
    if (Array.isArray(obj)) {
        return obj.some(item => containsCharInObject(item, escapedChar));
    }

    // Handle plain objects: Check each value recursively
    if (obj && typeof obj === 'object') {
        return Object.values(obj).some(value => containsCharInObject(value, escapedChar));
    }

    // If the input is neither string, array, nor object, return false
    return false;
}


function escapeInput(input) {
    // Handle null, undefined, or other primitive values by converting them to strings
    if (input === null || input === undefined) {
        return '';
    }

    // If input is an object or array, recursively process each value (to handle deeply nested structures)
    if (typeof input === 'object') {
        try {
            // If it's an array or an object, we recursively escape each property or item
            if (Array.isArray(input)) {
                return input.map(item => escapeInput(item));
            } else {
                return JSON.stringify(input, (key, value) => {
                    // Recursively escape each key and value
                    if (typeof value === 'string') {
                        return value.replace(/[$.]/g, ''); // Escape `$` and `.`
                    }
                    return value;
                });
            }
        } catch (e) {
            // If an error occurs during object processing, return a string representation of the object
            return String(input);
        }
    }

    // For primitive types (string, number, boolean, etc.), directly escape the string value
    return String(input).replace(/[$.]/g, ''); // Replace `$` and `.`
}


async function handleMessage(ws, message, playerVerified) {
    try {

        const escapedMessage = escapeInput(message.toString());
     
        // Parse the sanitized string as JSON
        const data = JSON.parse(escapedMessage);

           if (typeof message == 'string'){

            const datachunk = message.split(':');

           } else {

           // throw new Error("unexpected message type");
           }
        
        let response

        switch (data.id) {

            case "ping":        // Handle ping message and update last pong time
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
                response = await getshopdata()
                ws.send(JSON.stringify({ type: "shopdata", data: response }));
                break;

            case "buyitem":
                response = await buyItem(playerVerified.playerId, data.buyid)
                ws.send(JSON.stringify({ type: "buyitem", data: response }));
                break;

            case "profile":
                response = await getUserProfile(data.pid)
                ws.send(JSON.stringify({ type: "profile", data: response }));
                break;    

            case "openbox":
                response = await buyRarityBox(playerVerified.playerId)
                ws.send(JSON.stringify({ type: "openbox", data: response }));
                break;

            case "highscore":
                response = await gethighscores()
                ws.send(JSON.stringify({ type: "highscores", data: response }));
                break;
                

            default:
                ws.close(1007,"error");
                //ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
                break;
        }
    } catch (error) {
        ws.close(1007,"error");
    }
    
}


  const rateLimiterConnection = new RateLimiterMemory(ConnectionOptionsRateLimit);


wss.on("connection", (ws, req) => {

    if (maintenanceMode) {
        ws.close(4000, "maintenance")
    }

    console.log("Client connected");

    const playerVerified = ws.playerVerified;
    playerVerified.lastPongTime = Date.now();
    playerVerified.rateLimiter = createRateLimiter() // Set initial pong time

    ws.send(JSON.stringify({ type: "connection_success", accdata: playerVerified.inventory }));

    // Start ping-pong check every 10 seconds
    const pingIntervalId = setInterval(() => {
        if (ws && playerVerified.lastPongTime > Date.now() - 10000) {
        } else {

            ws.close(3845 ,"activity timeout",)
        }
    }, pingInterval);

    ws.on("message", async (message) => {
        try {
            const playerVerified = ws.playerVerified;

            if (!playerVerified.rateLimiter.tryRemoveTokens(1)) {

                ws.close(1007)

                return;
            }

            
            await handleMessage(ws, message, playerVerified);
        } catch (error) {
                    //ws.send(JSON.stringify({ type: "error", message: "Failed to process message" }));
                }
            }
    );

    ws.on("error", (error) => {
        if (error.message.includes('payload size')) {
            console.error('Payload size exceeded:', error.message);
            ws.close(1009, "Payload size exceeded"); // 1009: Close code for too large payload
        } else {
            console.error('WebSocket error:', error);
        }
    });

    ws.on("close", () => {
        clearInterval(pingIntervalId); // Clear ping-pong interval on disconnect

        const playerId = ws.playerVerified?.playerId;

        if (playerId) {
            // Remove from connected players map
            connectedPlayers.delete(playerId);
            connectedClientsCount--;

            // Optionally handle the player in the queue if they are there
            if (playerQueue.has(playerId)) {
                playerQueue.delete(playerId);
                console.log(`Player ${playerId} removed from queue due to disconnection.`);
            }

        }
    });
});

server.on("upgrade", async (request, socket, head) => {
    try {
        const ip = request.socket.remoteAddress//request.socket.remoteAddress//req.headers['x-forwarded-for']?.split(',')[0] || request.socket.remoteAddress;
        console.log(ip)

        if (!ip) return;
        // Consume rate limit for the IP
        await rateLimiterConnection.consume(ip);

        if (connectedClientsCount >= maxClients) {
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
            socket.destroy();
            return;
        }

        const origin = request.headers.origin;
        if (!allowedOrigins.includes(origin)) {
            console.error(`Unauthorized origin: ${origin}`);
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }
  
        const token = request.url.split('/')[1].replace(/\$/g, '');


        try {
            const playerVerified = await verifyPlayer(token);

            // Check for existing connection
            const existingConnection = connectedPlayers.get(playerVerified.playerId);

            if (existingConnection) {
                console.log(`Player ${playerVerified.playerId} already connected. Closing the existing connection.`);
                existingConnection.close(1001, "Reassigned connection");

                // Wait for the existing connection to close
                await new Promise(resolve => existingConnection.on('close', resolve));
                connectedPlayers.delete(playerVerified.playerId);
            }

            // Handle WebSocket upgrade
            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.playerVerified = playerVerified;

                // Add the new connection to the map
                connectedPlayers.set(playerVerified.playerId, ws);

                // Handle cleanup on disconnection
                ws.on("close", () => {
                    const playerId = ws.playerVerified?.playerId;
                    if (playerId) {
                        connectedPlayers.delete(playerId);
                    }
                    connectedClientsCount--;
                    console.log(`Player ${playerVerified.playerId} disconnected`);
                });

                // Increment connected clients count
                connectedClientsCount++;

                // Emit the connection event
                wss.emit("connection", ws, request);
            });

        } catch (error) {
            console.error('Token verification failed:', error.message);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }

    } catch (error) {
        if ("ratelimit") {
            socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        } else {
            console.error('Unexpected error:', error);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        }
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
  // Assuming you have a WebSocket server `wss` initialized
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
  
  // Disconnect all clients
  function closeAllClients(code, reason) {
    connectedPlayers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(code, reason);
      }
    });
  }
  
  
  