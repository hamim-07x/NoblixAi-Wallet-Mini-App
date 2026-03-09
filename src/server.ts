import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import fs from 'node:fs';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Initialize JSON Database
const DB_FILE = '/tmp/wallet_db.json';

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: {}, user_tasks: {}, wallets: {}, notifications: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.wallets) data.wallets = {};
    if (!data.notifications) data.notifications = [];
    return data;
  } catch (e) {
    return { users: {}, user_tasks: {}, wallets: {}, notifications: [] };
  }
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());

// API: Get Notifications
app.get('/api/notifications', (req, res) => {
  const db = readDB();
  res.json(db.notifications || []);
});

// API: Create Notification (Admin)
app.post('/api/notifications', (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: 'Title and message required' });
    return;
  }
  const newNotification = {
    id: Date.now().toString(),
    title,
    message,
    date: new Date().toISOString()
  };
  const db = readDB();
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift(newNotification);
  writeDB(db);
  res.json(newNotification);
});

// API: Delete Notification (Admin)
app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  if (!db.notifications) db.notifications = [];
  db.notifications = db.notifications.filter((n: any) => n.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// API: Authenticate Telegram User
app.post('/api/auth', (req, res) => {
  const { telegramId, username, firstName, photoUrl, referredBy } = req.body;
  if (!telegramId) {
    res.status(400).json({ error: 'Telegram ID required' });
    return;
  }

  const db = readDB();
  let user = db.users[telegramId];

  if (!user) {
    user = { 
      telegram_id: telegramId, 
      username, 
      first_name: firstName, 
      photo_url: photoUrl, 
      balance: 0, 
      created_at: new Date().toISOString(), 
      transactions: [],
      referred_by: referredBy || null,
      referrals: []
    };
    db.users[telegramId] = user;
    
    // Handle referral logic
    if (referredBy && db.users[referredBy] && referredBy !== telegramId) {
      if (!db.users[referredBy].referrals) {
        db.users[referredBy].referrals = [];
      }
      db.users[referredBy].referrals.push(telegramId);
      
      // Give referral reward
      db.users[referredBy].balance += 50; // 50 NBX reward
      if (!db.users[referredBy].transactions) db.users[referredBy].transactions = [];
      db.users[referredBy].transactions.unshift({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        tokenId: 'nbx',
        type: 'earn',
        amount: 50,
        title: `Referral Reward (${firstName})`,
        date: new Date().toISOString()
      });
    }
    
    writeDB(db);
  } else {
    // Update profile info
    user.username = username || user.username;
    user.first_name = firstName || user.first_name;
    user.photo_url = photoUrl || user.photo_url;
    writeDB(db);
  }

  if (!user.transactions) {
    user.transactions = [];
  }
  if (!user.referrals) {
    user.referrals = [];
  }

  const completedTasks = db.user_tasks[telegramId] || [];
  
  const referralsData = (user.referrals || []).map((refId: string) => {
    const refUser = db.users[refId];
    return {
      id: refId,
      name: refUser?.first_name || 'Unknown',
      joinedAt: new Date(refUser?.created_at || Date.now()).toLocaleDateString(),
      reward: '+50 NBX',
      avatar: refUser?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${refId}`
    };
  });
  
  user.referrals_data = referralsData;

  res.json({ user, completedTasks });
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
