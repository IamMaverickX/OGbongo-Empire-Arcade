const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Game statistics storage
const gameStats = new Map();

// API Routes
app.get('/api/stats/:playerId', (req, res) => {
    const stats = gameStats.get(req.params.playerId) || {
        totalSpins: 0,
        totalWagered: 0,
        totalWon: 0,
        biggestWin: 0
    };
    res.json(stats);
});

app.post('/api/spin', (req, res) => {
    const { playerId, betAmount } = req.body;
    
    // Simulate game logic (replace with actual blockchain integration)
    const result = simulateSpin();
    const winAmount = calculateWinAmount(betAmount, result);
    
    // Update stats
    updatePlayerStats(playerId, betAmount, winAmount);
    
    res.json({
        symbols: result,
        winAmount: winAmount,
        transactionId: 'simulated_tx_' + Date.now()
    });
});

function simulateSpin() {
    const symbols = ['🍒', '🍋', '🍊', '⭐', '💎'];
    return [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
}

function calculateWinAmount(betAmount, symbols) {
    // Same logic as frontend for consistency
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        const multipliers = { '💎': 50, '⭐': 20, '🍒': 10, '🍋': 5, '🍊': 3 };
        return betAmount * (multipliers[symbols[0]] || 3);
    }
    
    if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
        return betAmount * 2;
    }
    
    return 0;
}

function updatePlayerStats(playerId, betAmount, winAmount) {
    const stats = gameStats.get(playerId) || {
        totalSpins: 0,
        totalWagered: 0,
        totalWon: 0,
        biggestWin: 0
    };
    
    stats.totalSpins++;
    stats.totalWagered += betAmount;
    stats.totalWon += winAmount;
    
    if (winAmount > stats.biggestWin) {
        stats.biggestWin = winAmount;
    }
    
    gameStats.set(playerId, stats);
}

app.listen(PORT, () => {
    console.log(`Bongo Empire backend running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
});
