
const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");
const { randomUUID } = require("crypto");

const server = http.createServer((req, res) => {
    res.writeHead(404);
    res.end("WebSocket server online");
});

const wss = new WebSocketServer({ server });

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

    // Envia o estado inicial para o novo jogador
    ws.send(JSON.stringify({
        type: "init",
        id,
        players: Array.from(players.values())
    }));

    // Informa os demais jogadores
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

            player.x = data.x;
            player.y = data.y;
            player.z = data.z;
            player.rotationY = data.rotationY;

            broadcast({
                type: "player_moved",
                player
            }, ws);

        } catch (error) {
            console.error("Mensagem inválida:", error.message);
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
        console.error("Erro WebSocket:", error.message);
    });
});

// IMPORTANTE:
// Não utilizar server.listen() na Vercel.
// A Function exporta o servidor HTTP.

module.exports = server;
