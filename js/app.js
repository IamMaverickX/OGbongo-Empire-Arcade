// Add these functions to your existing app.js:

// Real spin with blockchain transactions
async function realSpinSlots() {
    if (gameState.spinning) return;
    
    const bet = parseInt(betAmount.value);
    
    if (!validateBet(bet)) return;
    
    gameState.spinning = true;
    spinButton.disabled = true;
    gameResult.textContent = '🔄 Processing blockchain transaction...';
    gameResult.className = 'text-blue-400';

    try {
        // Send REAL spin request to backend
        const response = await fetch('/api/spin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: gameState.publicKey.toString(),
                betAmount: bet
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Blockchain transaction failed');
        }

        if (result.success) {
            // Animate the slot machine with the actual result
            await animateReelsWithResult(result.symbols);
            
            // Update REAL token balance from blockchain
            gameState.tokenBalance = result.userBalance;
            updateBalanceDisplay();
            
            // Show REAL transaction result
            if (result.winAmount > 0) {
                gameResult.innerHTML = `
                    🎉 You won ${result.winAmount} OGB! 
                    <br>
                    <a href="${result.winTransaction.explorerUrl}" target="_blank" class="text-yellow-300 underline">
                        View transaction on Solscan
                    </a>
                `;
                gameResult.className = 'text-green-400 win-glow';
                
                // Add win animation
                document.querySelectorAll('.reel').forEach(reel => {
                    reel.classList.add('win-glow');
                    setTimeout(() => reel.classList.remove('win-glow'), 3000);
                });
            } else {
                gameResult.innerHTML = `
                    Better luck next time!
                    <br>
                    <a href="${result.betTransaction.explorerUrl}" target="_blank" class="text-blue-300 underline">
                        View transaction on Solscan
                    </a>
                `;
                gameResult.className = 'text-red-400';
            }
            
            // Update game statistics
            updateGameStats(result.winAmount);
            
            // Refresh casino info
            await loadCasinoInfo();
            
            console.log('✅ REAL Spin completed successfully');
            console.log('💸 Bet transaction:', result.betTransaction);
            if (result.winTransaction) {
                console.log('💰 Win transaction:', result.winTransaction);
            }
            
        } else {
            throw new Error(result.error || 'Spin failed');
        }
        
    } catch (error) {
        console.error('❌ REAL spin failed:', error);
        gameResult.innerHTML = `❌ ${error.message}`;
        gameResult.className = 'text-red-400';
    }

    gameState.spinning = false;
    spinButton.disabled = false;
}

// Replace the spinSlots function to use real transactions:
async function spinSlots() {
    await realSpinSlots();
}

// Update casino info display for real mode
function displayCasinoInfo(casinoInfo) {
    const statusColor = casinoInfo.casinoSOL > 0.1 ? 'text-green-400' : 'text-yellow-400';
    const statusText = casinoInfo.casinoSOL > 0.1 ? '🟢 Ready' : '🟡 Low SOL';
    
    const casinoHtml = `
        <div class="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-4 mt-6 text-center">
            <h4 class="font-bold mb-2">🏦 Casino Vault (LIVE MODE)</h4>
            <div class="text-sm space-y-2">
                <div>OGB Balance: <span class="font-bold">${casinoInfo.casinoBalance} OGB</span></div>
                <div>SOL for Fees: <span class="font-bold ${statusColor}">${casinoInfo.casinoSOL} SOL</span></div>
                <div class="text-xs">Status: ${statusText}</div>
                <div class="text-xs font-mono break-all bg-black bg-opacity-30 p-2 rounded mt-2">
                    ${casinoInfo.casinoWallet}
                </div>
            </div>
        </div>
    `;
    
    // Add to page if not already there
    if (!document.getElementById('casinoInfo')) {
        const casinoDiv = document.createElement('div');
        casinoDiv.id = 'casinoInfo';
        casinoDiv.innerHTML = casinoHtml;
        document.querySelector('.container').appendChild(casinoDiv);
    } else {
        document.getElementById('casinoInfo').innerHTML = casinoHtml;
    }
}

// Update wallet connection to show real mode
async function connectWallet() {
    try {
        const response = await window.solana.connect();
        gameState.publicKey = response.publicKey;
        gameState.isConnected = true;
        
        await updateWalletUI();
        await loadTokenBalance();
        await loadCasinoInfo();
        
        console.log('✅ Wallet connected:', gameState.publicKey.toString());
        
        // Show real mode notification
        gameResult.textContent = '🚀 Connected - REAL blockchain mode active!';
        gameResult.className = 'text-green-400';
        
    } catch (err) {
        console.error('❌ Wallet connection failed:', err);
        gameResult.textContent = 'Wallet connection failed! Please try again.';
        gameResult.className = 'text-red-400';
    }
}
