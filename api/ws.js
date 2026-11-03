
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";

const server = http.createServer((req, res) => {
    res.writeHead(404, {
        "Content-Type": "text/plain"
    });
    res.end("WebSocket endpoint active");
});

const wss = new WebSocketServer({
    server,
    path: "/api/ws"
});

const players = new Map();

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

wss.on("connection", (ws) => {
    const id = randomUUID();

    const player = {
        id,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0
    };

    players.set(id, player);

    ws.send(JSON.stringify({
        type: "init",
        id,
        players: Array.from(players.values())
    }));

    broadcast({
        type: "player_joined",
        player
    }, ws);

    console.log("Jogador conectado:", id);

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

            Object.assign(player, {
                x: data.x,
                y: data.y,
                z: data.z,
                rotationY: data.rotationY
            });

            broadcast({
                type: "player_moved",
                player
            }, ws);

        } catch (error) {
            console.error("Mensagem inválida:", error);
        }
    });

    ws.on("close", () => {
        players.delete(id);

        broadcast({
            type: "player_left",
            id
        });

        console.log("Jogador desconectado:", id);
    });

    ws.on("error", (error) => {
        console.error("WebSocket:", error.message);
    });
});

export default server;
