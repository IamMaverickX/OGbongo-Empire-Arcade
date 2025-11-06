// Add casino info display
async function loadCasinoInfo() {
    try {
        const response = await fetch('/api/casino-info');
        if (response.ok) {
            const casinoInfo = await response.json();
            displayCasinoInfo(casinoInfo);
        }
    } catch (error) {
        console.log('⚠️ Could not load casino info');
    }
}

function displayCasinoInfo(casinoInfo) {
    const casinoHtml = `
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 mt-6 text-center">
            <h4 class="font-bold mb-2">🏦 Casino Vault (SIMULATION MODE)</h4>
            <div class="text-sm">
                <div>Balance: <span class="font-bold">${casinoInfo.casinoBalance} OGB</span></div>
                <div class="text-xs font-mono mt-1">${casinoInfo.casinoWallet}</div>
                <div class="text-xs text-yellow-300 mt-1">🔸 Simulation Mode - No real transactions</div>
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

// Connect wallet button handler
connectWalletBtn.addEventListener('click', connectWallet);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    addBuyTokensSection();
});

// Symbol constants
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];
