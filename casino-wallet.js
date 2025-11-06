import { Keypair } from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CasinoWallet {
    constructor() {
        this.keypair = this.loadOrCreateWallet();
        this.publicKey = this.keypair.publicKey;
    }

    loadOrCreateWallet() {
        const walletPath = join(__dirname, 'casino-wallet.json');
        
        if (existsSync(walletPath)) {
            console.log('💰 Loading existing casino wallet...');
            const keypairData = JSON.parse(readFileSync(walletPath, 'utf8'));
            return Keypair.fromSecretKey(new Uint8Array(keypairData));
        } else {
            console.log('🆕 Creating new casino wallet...');
            const newKeypair = Keypair.generate();
            const secretKeyArray = Array.from(newKeypair.secretKey);
            writeFileSync(walletPath, JSON.stringify(secretKeyArray));
            console.log('✅ Casino wallet created and saved:', newKeypair.publicKey.toString());
            return newKeypair;
        }
    }

    getPublicKey() {
        return this.publicKey.toString();
    }

    getKeypair() {
        return this.keypair;
    }
}

export default CasinoWallet;
