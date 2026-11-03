
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const players = new Map();

function log(...args) {
    console.log("[MULTIPLAYER]", new Date().toISOString(), ...args);
}

function broadcast(data, exclude = null) {
    const message = JSON.stringify(data);

    for (const client of wss.clients) {
        if (
            client !== exclude &&
            client.readyState === WebSocket.OPEN
        ) {
            client.send(message);
        }
    }
}

wss.on("connection", (ws, req) => {
    const id = randomUUID();

    const player = {
        id,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0
    };

    players.set(id, player);

    log("PLAYER CONNECTED:", id);
    log("TOTAL PLAYERS NESTA INSTÂNCIA:", players.size);

    ws.send(JSON.stringify({
        type: "init",
        id,
        players: Array.from(players.values())
    }));

    broadcast({
        type: "player_joined",
        player
    }, ws);

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type !== "move") return;

            const values = [
                data.x,
                data.y,
                data.z,
                data.rotationY
            ];

            if (!values.every(Number.isFinite)) return;

            player.x = data.x;
            player.y = data.y;
            player.z = data.z;
            player.rotationY = data.rotationY;

            broadcast({
                type: "player_moved",
                player
            }, ws);

        } catch (error) {
            log("INVALID MESSAGE:", error.message);
        }
    });

    ws.on("close", () => {
        players.delete(id);

        log("PLAYER DISCONNECTED:", id);
        log("TOTAL PLAYERS:", players.size);

        broadcast({
            type: "player_left",
            id
        });
    });

    ws.on("error", (error) => {
        log("WEBSOCKET ERROR:", error.message);
    });
});

export default server;
