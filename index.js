
const express = require("express");
const { randomUUID } = require("crypto");

const app = express();
app.use(express.json());

const players = new Map();

// Jogador entra
app.post("/join", (req, res) => {
    const id = randomUUID();

    players.set(id, {
        id,
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        lastUpdate: Date.now()
    });

    res.json({ id });
});

// Atualizar posição
app.post("/move", (req, res) => {
    const { id, x, y, z, rotationY } = req.body;
    const player = players.get(id);

    if (!player) {
        return res.status(404).json({ error: "Player não encontrado" });
    }

    if (![x, y, z, rotationY].every(Number.isFinite)) {
        return res.status(400).json({ error: "Posição inválida" });
    }

    Object.assign(player, {
        x, y, z, rotationY,
        lastUpdate: Date.now()
    });

    res.sendStatus(200);
});

// Buscar outros jogadores
app.get("/players/:id", (req, res) => {
    const now = Date.now();

    // Remover jogadores inativos há mais de 30 segundos
    for (const [id, player] of players) {
        if (now - player.lastUpdate > 30000) {
            players.delete(id);
        }
    }

    const result = [...players.values()]
        .filter(player => player.id !== req.params.id);

    res.json(result);
});

// Jogador sai
app.delete("/leave/:id", (req, res) => {
    players.delete(req.params.id);
    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Express Multiplayer Online");
});
