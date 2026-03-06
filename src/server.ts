import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import fs from 'node:fs';
import { ethers } from 'ethers';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Base Sepolia RPC
const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Initialize JSON Database
const DB_FILE = join(process.cwd(), 'wallet_db.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: {}, user_tasks: {}, wallets: {} };
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.wallets) data.wallets = {};
    return data;
  } catch (e) {
    return { users: {}, user_tasks: {}, wallets: {} };
  }
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());

// API: Authenticate Telegram User
app.post('/api/auth', (req, res) => {
  const { telegramId, username, firstName, photoUrl } = req.body;
  if (!telegramId) {
    res.status(400).json({ error: 'Telegram ID required' });
    return;
  }

  const db = readDB();
  let user = db.users[telegramId];

  if (!user) {
    user = { telegram_id: telegramId, username, first_name: firstName, photo_url: photoUrl, balance: 0, created_at: new Date().toISOString(), transactions: [] };
    db.users[telegramId] = user;
    writeDB(db);
  }

  if (!user.transactions) {
    user.transactions = [];
  }

  // Generate EVM Wallet if not exists
  if (!db.wallets[telegramId]) {
    const wallet = ethers.Wallet.createRandom();
    db.wallets[telegramId] = {
      address: wallet.address,
      encrypted_private_key: encrypt(wallet.privateKey),
      created_at: new Date().toISOString()
    };
    writeDB(db);
  }

  const userWallet = { address: db.wallets[telegramId].address };
  const completedTasks = db.user_tasks[telegramId] || [];

  res.json({ user, completedTasks, wallet: userWallet });
});

// API: Complete Task
app.post('/api/tasks/complete', (req, res) => {
  const { telegramId, taskId, reward, taskTitle } = req.body;
  if (!telegramId || !taskId) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  const db = readDB();
  
  if (!db.users[telegramId]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!db.user_tasks[telegramId]) {
    db.user_tasks[telegramId] = [];
  }

  if (db.user_tasks[telegramId].includes(taskId)) {
    res.status(400).json({ error: 'Task already completed' });
    return;
  }

  db.user_tasks[telegramId].push(taskId);
  db.users[telegramId].balance += reward;
  
  if (!db.users[telegramId].transactions) {
    db.users[telegramId].transactions = [];
  }
  
  const newTx = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    tokenId: 'nbx',
    type: 'earn',
    amount: reward,
    title: taskTitle || 'Task Reward',
    date: new Date().toISOString()
  };
  
  db.users[telegramId].transactions.unshift(newTx);
  
  writeDB(db);

  res.json({ success: true, newBalance: db.users[telegramId].balance, transaction: newTx });
});

// API: Get Wallet Balance
app.get('/api/wallet/balance', async (req, res) => {
  const telegramId = req.query['telegramId'] as string;
  if (!telegramId) {
    res.status(400).json({ error: 'Telegram ID required' });
    return;
  }
  
  const db = readDB();
  const wallet = db.wallets[telegramId];
  if (!wallet) {
    res.status(404).json({ error: 'Wallet not found' });
    return;
  }
  
  try {
    const balanceWei = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balanceWei);
    res.json({ balance: balanceEth, address: wallet.address });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// API: Withdraw Funds
app.post('/api/wallet/withdraw', async (req, res) => {
  const { telegramId, toAddress, amount } = req.body;
  if (!telegramId || !toAddress || !amount) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }
  
  const db = readDB();
  const walletData = db.wallets[telegramId];
  if (!walletData) {
    res.status(404).json({ error: 'Wallet not found' });
    return;
  }
  
  try {
    const privateKey = decrypt(walletData.encrypted_private_key);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString())
    });
    
    res.json({ success: true, txHash: tx.hash });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Transaction failed' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
