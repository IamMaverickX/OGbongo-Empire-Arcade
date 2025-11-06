import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Solana connection - MAINNET
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const OGB_TOKEN_MINT = new PublicKey('6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Game statistics storage
const gameStats = new Map();

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Server is running!', 
        timestamp: new Date().toISOString(),
        network: 'Solana Mainnet',
        token: 'OGB',
        tokenAddress: OGB_TOKEN_MINT.toString()
    });
});

app.get('/api/token-info', async (req, res) => {
    try {
        const tokenInfo = {
            mint: OGB_TOKEN_MINT.toString(),
            name: 'OGB Token',
            symbol: 'OGB',
            network: 'mainnet-beta',
            decimals: 6, // Pump.fun tokens usually have 6 decimals
            buyUrl: 'https://pump.fun/coin/6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump'
        };
        res.json(tokenInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/verify-balance', async (req, res) => {
    try {
        const { publicKey, requiredAmount } = req.body;
        
        if (!publicKey) {
            return res.status(400).json({ error: 'Public key required' });
        }

        const userPublicKey = new PublicKey(publicKey);
        const tokenAccount = await getAssociatedTokenAddress(OGB_TOKEN_MINT, userPublicKey);

        try {
            const accountInfo = await getAccount(connection, tokenAccount);
            const balance = Number(accountInfo.amount) / Math.pow(10, 6); // 6 decimals for Pump.fun
            const hasSufficientBalance = balance >= requiredAmount;

            res.json({
                balance: balance,
                hasSufficientBalance: hasSufficientBalance,
                requiredAmount: requiredAmount,
                tokenAddress: OGB_TOKEN_MINT.toString()
            });
        } catch (error) {
            // Token account doesn't exist
            res.json({
                balance: 0,
                hasSufficientBalance: false,
                requiredAmount: requiredAmount,
                tokenAddress: OGB_TOKEN_MINT.toString()
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/spin', async (req, res) => {
    try {
        const { playerId, betAmount } = req.body;
        
        // Verify user has sufficient balance
        const balanceCheck = await verifyUserBalance(playerId, betAmount);
        if (!balanceCheck.hasSufficientBalance) {
            return res.status(400).json({ 
                error: 'Insufficient OGB tokens',
                currentBalance: balanceCheck.balance,
                required: betAmount
            });
        }

        // Process the spin
        const result = await processSpin(playerId, betAmount);
        
        res.json({
            success: true,
            symbols: result.symbols,
            winAmount: result.winAmount,
            betAmount: betAmount,
            transactionId: result.transactionId,
            newBalance: result.newBalance
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            tokenAddress: OGB_TOKEN_MINT.toString()
        });
    }
});

async function verifyUserBalance(publicKey, requiredAmount) {
    const userPublicKey = new PublicKey(publicKey);
    const tokenAccount = await getAssociatedTokenAddress(OGB_TOKEN_MINT, userPublicKey);

    try {
        const accountInfo = await getAccount(connection, tokenAccount);
        const balance = Number(accountInfo.amount) / Math.pow(10, 6);
        return {
            balance: balance,
            hasSufficientBalance: balance >= requiredAmount
        };
    } catch (error) {
        return {
            balance: 0,
            hasSufficientBalance: false
        };
    }
}

async function processSpin(playerId, betAmount) {
    // Generate random slot result
    const symbols = generateSlotResult();
    const winAmount = calculateWinAmount(betAmount, symbols);
    
    // In a real implementation, here you would:
    // 1. Create transaction to transfer bet amount to casino vault
    // 2. If win, create transaction to transfer winnings to player
    // 3. Submit transactions to blockchain
    
    return {
        symbols: symbols,
        winAmount: winAmount,
        transactionId: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        newBalance: await getCurrentBalance(playerId)
    };
}

function generateSlotResult() {
    const symbols = ['🍒', '🍋', '🍊', '⭐', '💎'];
    return [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
}

function calculateWinAmount(betAmount, symbols) {
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        const multipliers = { '💎': 50, '⭐': 20, '🍒': 10, '🍋': 5, '🍊': 3 };
        return betAmount * (multipliers[symbols[0]] || 3);
    }
    
    if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
        return betAmount * 2;
    }
    
    return 0;
}

async function getCurrentBalance(publicKey) {
    try {
        const userPublicKey = new PublicKey(publicKey);
        const tokenAccount = await getAssociatedTokenAddress(OGB_TOKEN_MINT, userPublicKey);
        const accountInfo = await getAccount(connection, tokenAccount);
        return Number(accountInfo.amount) / Math.pow(10, 6);
    } catch (error) {
        return 0;
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🎰 Bongo Empire Arcade Server running!`);
    console.log(`📍 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
    console.log(`💰 OGB Token: ${OGB_TOKEN_MINT.toString()}`);
    console.log(`🛒 Buy OGB: https://pump.fun/coin/6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump`);
    console.log(`🌐 Network: Solana Mainnet`);
});
