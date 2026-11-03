
const http = require("http");
const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");

const server = http.createServer();
const wss = new WebSocketServer({ server });

const players = new Map();

function broadcast(data, exclude = null) {
    const message = JSON.stringify(data);

    for (const client of wss.clients) {
        if (client !== exclude && client.readyState === 1) {
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

    broadcast({ type: "player_joined", player }, ws);

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type !== "move") return;

            player.x = Number(data.x) || 0;
            player.y = Number(data.y) || 0;
            player.z = Number(data.z) || 0;
            player.rotationY = Number(data.rotationY) || 0;

            broadcast({
                type: "player_moved",
                player
            }, ws);

        } catch {
            console.log("Mensagem inválida");
        }
    });

    ws.on("close", () => {
        players.delete(id);
        broadcast({ type: "player_left", id });
    });
});

server.listen(8080, () => {
    console.log("Servidor online na porta 8080");
});
