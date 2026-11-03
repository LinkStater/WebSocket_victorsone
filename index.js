
const express = require("express");
const { randomUUID } = require("crypto");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Jogadores conectados
const players = new Map();

const HEARTBEAT_TIMEOUT = 10000;

// ======================================
// ENTRAR NO JOGO
// ======================================

app.post("/join", (req, res) => {
    const id = randomUUID();

    const player = {
        id,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        lastUpdate: Date.now()
    };

    players.set(id, player);

    console.log("PLAYER CONNECTED:", id);
    console.log("TOTAL PLAYERS:", players.size);

    res.json({ id });
});

// ======================================
// ATUALIZAR POSIÇÃO
// ======================================

app.post("/move", (req, res) => {
    const { id, x, y, z, rotationY } = req.body;

    const player = players.get(id);

    if (!player) {
        return res.status(404).json({
            error: "Player não encontrado"
        });
    }

    const values = [x, y, z, rotationY];

    if (!values.every(Number.isFinite)) {
        return res.status(400).json({
            error: "Posição inválida"
        });
    }

    Object.assign(player, {
        x,
        y,
        z,
        rotationY,
        lastUpdate: Date.now()
    });

    res.sendStatus(200);
});

// ======================================
// HEARTBEAT
// ======================================

app.post("/heartbeat/:id", (req, res) => {
    const player = players.get(req.params.id);

    if (!player) {
        return res.status(404).json({
            error: "Player não encontrado"
        });
    }

    player.lastUpdate = Date.now();

    res.sendStatus(200);
});

// ======================================
// BUSCAR OUTROS JOGADORES
// ======================================

app.get("/players/:id", (req, res) => {
    const playerId = req.params.id;

    const result = Array.from(players.values())
        .filter(player => player.id !== playerId)
        .map(player => ({
            id: player.id,
            x: player.x,
            y: player.y,
            z: player.z,
            rotationY: player.rotationY
        }));

    res.json(result);
});

// ======================================
// DESCONECTAR
// ======================================

app.delete("/leave/:id", (req, res) => {
    const id = req.params.id;

    if (players.delete(id)) {
        console.log("PLAYER LEFT:", id);
        console.log("TOTAL PLAYERS:", players.size);
    }

    res.sendStatus(200);
});

// ======================================
// DETECTAR JOGADORES DESCONECTADOS
// ======================================

setInterval(() => {
    const now = Date.now();

    for (const [id, player] of players) {
        const inactiveTime = now - player.lastUpdate;

        if (inactiveTime > HEARTBEAT_TIMEOUT) {
            players.delete(id);

            console.log("PLAYER DISCONNECTED:", id);
            console.log("TOTAL PLAYERS:", players.size);
        }
    }
}, 3000);

// ======================================
// STATUS
// ======================================

app.get("/", (req, res) => {
    res.json({
        status: "Multiplayer API Online",
        players: players.size
    });
});

// ======================================
// EXPORTAR API
// ======================================

if (require.main === module) {
    app.listen(PORT, () => {
        console.log("MULTIPLAYER API ONLINE:", PORT);
    });
}

module.exports = app;
