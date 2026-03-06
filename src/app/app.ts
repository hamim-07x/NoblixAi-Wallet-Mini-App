import { ChangeDetectionStrategy, Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

declare global {
  interface Window {
    Telegram: any;
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  activeTab = signal('wallet');
  totalBalance = signal(0);
  toastMessage = signal<string | null>(null);
  telegramUser = signal<any>(null);
  selectedToken = signal<any>(null);
  transactions = signal<any[]>([]);
  leaderboard = signal([
    { id: 1, name: 'Alex M.', points: 12500, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { id: 2, name: 'Sarah K.', points: 10200, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: 3, name: 'Mike T.', points: 8900, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { id: 4, name: 'Demo User', points: 5400, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', isCurrentUser: true },
    { id: 5, name: 'John D.', points: 4200, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
  ]);
  notificationsEnabled = signal(true);
  biometricsEnabled = signal(false);
  isBalanceHidden = signal(false);
  currentLanguage = signal('en');
  currentCurrency = signal('USD');
  showAdminPanel = signal(false);
  adminTab = signal('tasks');
  newTaskTitle = signal('');
  newTaskReward = signal('');
  newTaskType = signal('regular');
  showNotifications = signal(false);
  tokenTab = signal('1H');
  showReceiveQR = signal(false);
  showWithdrawModal = signal(false);
  withdrawAddress = signal('');
  withdrawAmount = signal('');
  
  showNbxTransferModal = signal(false);
  nbxTransferToId = signal('');
  nbxTransferAmount = signal<number | null>(null);
  estimatedGasFee = signal<string>('0.00');
  isEstimatingGas = signal(false);
  
  evmWallet = signal<any>(null);
  private priceInterval: any;
  
  exchangeRates = { USD: 1, EUR: 0.92, INR: 83.5, BDT: 110.0 };
  currencySymbols = { USD: '$', EUR: '€', INR: '₹', BDT: '৳' };

  notifications = signal([
    { id: 1, title: 'Welcome to NoblixAi!', message: 'Start completing tasks to earn NBX.', date: new Date(), read: false }
  ]);

  translations: Record<string, Record<string, string>> = {
    en: {
      'wallet': 'Wallet',
      'tasks': 'Tasks',
      'friends': 'Friends',
      'leaderboard': 'Leaderboard',
      'profile': 'Profile',
      'total_balance': 'Total Balance',
      'your_assets': 'Your Assets',
      'task_center': 'Task Center',
      'earn_nbx': 'Earn NBX by completing tasks',
      'daily_tasks': 'Daily Tasks',
      'top_earners': 'Top Earners',
      'rank': 'Rank',
      'user': 'User',
      'points': 'Points',
      'invite_friends': 'Invite Friends',
      'referral_link': 'Your Referral Link',
      'copy_link': 'Copy Link',
      'referrals': 'Your Referrals',
      'earn_per_referral': 'Earn 50 NBX per referral',
      'settings': 'Settings',
      'push_notifications': 'Push Notifications',
      'biometric_login': 'Biometric Login',
      'language': 'Language',
      'currency': 'Currency',
      'admin_panel': 'Admin Panel',
      'deposit': 'Deposit',
      'withdraw': 'Withdraw',
      'pay': 'Pay',
      'send': 'Send',
      'receive': 'Receive',
      'swap': 'Swap',
      'transaction_history': 'Transaction History',
      'no_transactions': 'No transactions yet',
      'demo_user': 'Demo User',
      'no_username': 'No Username',
      'account_status': 'Account Status',
      'verified': 'Verified',
      'referral_tasks': 'Referral Tasks'
    },
    hi: {
      'wallet': 'वॉलेट',
      'tasks': 'टास्क',
      'friends': 'दोस्त',
      'leaderboard': 'लीडरबोर्ड',
      'profile': 'प्रोफ़ाइल',
      'total_balance': 'कुल बैलेंस',
      'your_assets': 'आपकी संपत्ति',
      'task_center': 'टास्क केंद्र',
      'earn_nbx': 'टास्क पूरे करके NBX कमाएं',
      'daily_tasks': 'दैनिक टास्क',
      'top_earners': 'शीर्ष कमाने वाले',
      'rank': 'रैंक',
      'user': 'उपयोगकर्ता',
      'points': 'अंक',
      'invite_friends': 'दोस्तों को आमंत्रित करें',
      'referral_link': 'आपका रेफरल लिंक',
      'copy_link': 'लिंक कॉपी करें',
      'referrals': 'आपके रेफरल',
      'earn_per_referral': 'प्रति रेफरल 50 NBX कमाएं',
      'settings': 'सेटिंग्स',
      'push_notifications': 'पुश सूचनाएं',
      'biometric_login': 'बायोमेट्रिक लॉगिन',
      'language': 'भाषा',
      'currency': 'मुद्रा',
      'admin_panel': 'एडमिन पैनल',
      'deposit': 'जमा करें',
      'withdraw': 'निकालना',
      'pay': 'भुगतान',
      'send': 'भेजें',
      'receive': 'प्राप्त करें',
      'swap': 'स्वैप',
      'transaction_history': 'लेनदेन इतिहास',
      'no_transactions': 'कोई लेनदेन नहीं',
      'demo_user': 'डेमो उपयोगकर्ता',
      'no_username': 'कोई उपयोगकर्ता नाम नहीं',
      'account_status': 'खाता स्थिति',
      'verified': 'सत्यापित',
      'referral_tasks': 'रेफरल टास्क'
    },
    bn: {
      'wallet': 'ওয়ালেট',
      'tasks': 'টাস্ক',
      'friends': 'বন্ধু',
      'leaderboard': 'লিডারবোর্ড',
      'profile': 'প্রোফাইল',
      'total_balance': 'মোট ব্যালেন্স',
      'your_assets': 'আপনার সম্পদ',
      'task_center': 'টাস্ক সেন্টার',
      'earn_nbx': 'টাস্ক করে NBX আয় করুন',
      'daily_tasks': 'দৈনিক টাস্ক',
      'top_earners': 'শীর্ষ উপার্জনকারী',
      'rank': 'র‍্যাঙ্ক',
      'user': 'ব্যবহারকারী',
      'points': 'পয়েন্ট',
      'invite_friends': 'বন্ধুদের আমন্ত্রণ জানান',
      'referral_link': 'আপনার রেফারেল লিঙ্ক',
      'copy_link': 'লিঙ্ক কপি করুন',
      'referrals': 'আপনার রেফারেল',
      'earn_per_referral': 'প্রতি রেফারেল ৫০ NBX পান',
      'settings': 'সেটিংস',
      'push_notifications': 'পুশ নোটিফিকেশন',
      'biometric_login': 'বায়োমেট্রিক লগইন',
      'language': 'ভাষা',
      'currency': 'মুদ্রা',
      'admin_panel': 'অ্যাডমিন প্যানেল',
      'deposit': 'ডিপোজিট',
      'withdraw': 'উত্তোলন',
      'pay': 'পে',
      'send': 'পাঠান',
      'receive': 'গ্রহণ করুন',
      'swap': 'অদলবদল',
      'transaction_history': 'লেনদেনের ইতিহাস',
      'no_transactions': 'কোনো লেনদেন নেই',
      'demo_user': 'ডেমো ইউজার',
      'no_username': 'কোনো ইউজারনেম নেই',
      'account_status': 'অ্যাকাউন্ট স্ট্যাটাস',
      'verified': 'ভেরিফাইড',
      'referral_tasks': 'রেফারেল টাস্ক'
    },
    ru: {
      'wallet': 'Кошелек',
      'tasks': 'Задачи',
      'friends': 'Друзья',
      'leaderboard': 'Лидеры',
      'profile': 'Профиль',
      'total_balance': 'Общий баланс',
      'your_assets': 'Ваши активы',
      'task_center': 'Центр задач',
      'earn_nbx': 'Зарабатывайте NBX за задачи',
      'daily_tasks': 'Ежедневные задачи',
      'top_earners': 'Лучшие',
      'rank': 'Ранг',
      'user': 'Пользователь',
      'points': 'Очки',
      'invite_friends': 'Пригласить друзей',
      'referral_link': 'Ваша ссылка',
      'copy_link': 'Копировать',
      'referrals': 'Ваши рефералы',
      'earn_per_referral': 'Заработайте 50 NBX за реферала',
      'settings': 'Настройки',
      'push_notifications': 'Уведомления',
      'biometric_login': 'Биометрия',
      'language': 'Язык',
      'currency': 'Валюта',
      'admin_panel': 'Админ панель',
      'deposit': 'Депозит',
      'withdraw': 'Вывод',
      'pay': 'Оплатить',
      'send': 'Отправить',
      'receive': 'Получить',
      'swap': 'Обмен',
      'transaction_history': 'История транзакций',
      'no_transactions': 'Нет транзакций',
      'demo_user': 'Демо Пользователь',
      'no_username': 'Нет имени пользователя',
      'account_status': 'Статус аккаунта',
      'verified': 'Проверен',
      'referral_tasks': 'Реферальные задачи'
    }
  };

  t(key: string): string {
    return this.translations[this.currentLanguage()][key] || key;
  }
  
  tokens = signal([
    { id: 'btc', name: 'Bitcoin', symbol: 'BTC', balance: 0.00000000, price: 70949, change24h: 2.4, imgUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', balance: 0.00000000, price: 3500.36, change24h: -1.2, imgUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { id: 'sol', name: 'Solana', symbol: 'SOL', balance: 0.0000, price: 145.20, change24h: 5.4, imgUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { id: 'ton', name: 'Toncoin', symbol: 'TON', balance: 0.0000, price: 6.35, change24h: 5.8, imgUrl: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png' },
    { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', balance: 0.0000, price: 0.16, change24h: 1.2, imgUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
    { id: 'not', name: 'Notcoin', symbol: 'NOT', balance: 0.0000, price: 0.015, change24h: 15.8, imgUrl: 'https://assets.coingecko.com/coins/images/35473/small/notcoin.png' },
    { id: 'pepe', name: 'Pepe', symbol: 'PEPE', balance: 0.0000, price: 0.000012, change24h: -3.4, imgUrl: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg' },
    { id: 'usdt', name: 'Tether', symbol: 'USDT', balance: 0.0000, price: 1, change24h: 0.01, imgUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { id: 'nbx', name: 'Noblix', symbol: 'NBX', balance: 0.00, price: 0.01, change24h: 12.5, isCustom: true, customClass: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
  ]);

  sortedTokens = computed(() => {
    return [...this.tokens()].sort((a, b) => {
      const valA = a.balance * a.price;
      const valB = b.balance * b.price;
      if (valA !== valB) return valB - valA;
      return b.price - a.price;
    });
  });

  tasks = signal([
    { id: 1, title: 'Early Beta Access - Staking Earn & Like RT', reward: '+20 NBX', action: 'Start', completed: false, type: 'regular' },
    { id: 2, title: 'NBX SeeGoodW & Like RT', reward: '+20 NBX', action: 'Start', completed: false, type: 'regular' },
    { id: 3, title: 'Invite 5 Friends', reward: '+100 NBX', action: 'Invite', completed: false, type: 'referral' },
  ]);

  friendsList = signal([
    { id: 1, name: 'Alice W.', joinedAt: '2 days ago', reward: '+50 NBX', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
    { id: 2, name: 'Bob M.', joinedAt: '5 days ago', reward: '+50 NBX', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
  ]);

  async ngOnInit() {
    await this.initTelegramUser();
    this.fetchLivePrices();
    this.priceInterval = setInterval(() => {
      this.fetchLivePrices();
      if (this.evmWallet()) {
        this.fetchEvmBalance(this.evmWallet().address);
      }
    }, 30000);
  }

  ngOnDestroy() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
    }
  }

  async initTelegramUser() {
    if (typeof window === 'undefined') return; // Skip on server

    let tgUser = null;
    
    // Check if running inside Telegram WebApp
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      window.Telegram.WebApp.expand();
    } else {
      // Mock user for browser testing
      tgUser = {
        id: '123456789',
        username: 'HAMIM07X',
        first_name: 'Hamim',
        photo_url: 'https://picsum.photos/seed/avatar/96/96'
      };
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: tgUser.id.toString(),
          username: tgUser.username,
          firstName: tgUser.first_name,
          photoUrl: tgUser.photo_url
        })
      });
      
      if (!response.ok) throw new Error('Auth failed');
      
      const data = await response.json();
      this.telegramUser.set(data.user);
      this.transactions.set(data.user.transactions || []);
      if (data.wallet) {
        this.evmWallet.set(data.wallet);
        this.fetchEvmBalance(data.wallet.address);
      }
      
      // Update NBX balance from DB
      this.tokens.update(tokens => tokens.map(t => 
        t.id === 'nbx' ? { ...t, balance: data.user.balance } : t
      ));
      
      // Update completed tasks
      this.tasks.update(tasks => tasks.map(t => 
        data.completedTasks.includes(t.id) ? { ...t, completed: true, action: 'Done' } : t
      ));
      
      this.calculateTotalBalance();
    } catch (e) {
      console.error('Failed to authenticate with backend', e);
      this.showToast('Failed to load user data');
    }
  }

  async fetchEvmBalance(address: string) {
    try {
      const response = await fetch(`/api/wallet/balance?telegramId=${this.telegramUser().id}`);
      if (response.ok) {
        const data = await response.json();
        this.tokens.update(tokens => {
          const ethToken = tokens.find(t => t.id === 'eth');
          if (ethToken) {
            return tokens.map(t => t.id === 'eth' ? { ...t, balance: parseFloat(data.balance) } : t);
          } else {
            return [...tokens, { id: 'eth', name: 'Ethereum (Base)', symbol: 'ETH', balance: parseFloat(data.balance), price: 3500, change24h: 0, imgUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' }];
          }
        });
        this.calculateTotalBalance();
      }
    } catch (e) {
      console.error('Failed to fetch EVM balance', e);
    }
  }

  async withdrawEvm() {
    if (!this.withdrawAddress() || !this.withdrawAmount()) {
      this.showToast('Please enter address and amount');
      return;
    }
    
    this.showToast('Processing transaction...');
    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: this.telegramUser().id.toString(),
          toAddress: this.withdrawAddress(),
          amount: this.withdrawAmount(),
          tokenSymbol: this.selectedToken()?.symbol
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.showToast('Withdrawal successful!');
        this.showWithdrawModal.set(false);
        this.withdrawAddress.set('');
        this.withdrawAmount.set('');
        this.fetchEvmBalance(this.evmWallet().address);
      } else {
        this.showToast(data.error || 'Withdrawal failed');
      }
    } catch (e) {
      this.showToast('Network error during withdrawal');
    }
  }

  async fetchLivePrices() {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","TONUSDT"]');
      const data = await response.json();
      
      const priceMap: Record<string, { price: number, change: number }> = {};
      data.forEach((item: any) => {
        priceMap[item.symbol] = {
          price: parseFloat(item.lastPrice),
          change: parseFloat(item.priceChangePercent)
        };
      });
      
      this.tokens.update(currentTokens => {
        return currentTokens.map(token => {
          if (token.id === 'btc' && priceMap['BTCUSDT']) {
            token.price = priceMap['BTCUSDT'].price;
            token.change24h = priceMap['BTCUSDT'].change;
          }
          if (token.id === 'eth' && priceMap['ETHUSDT']) {
            token.price = priceMap['ETHUSDT'].price;
            token.change24h = priceMap['ETHUSDT'].change;
          }
          if (token.id === 'ton' && priceMap['TONUSDT']) {
            token.price = priceMap['TONUSDT'].price;
            token.change24h = priceMap['TONUSDT'].change;
          }
          return token;
        });
      });
      this.calculateTotalBalance();
    } catch (error) {
      console.error('Failed to fetch live prices', error);
    }
  }

  calculateTotalBalance() {
    let total = this.tokens().reduce((sum, token) => sum + (token.balance * token.price), 0);
    this.totalBalance.set(this.getConvertedPrice(total));
  }

  getConvertedPrice(usdPrice: number): number {
    const rate = this.exchangeRates[this.currentCurrency() as keyof typeof this.exchangeRates] || 1;
    return usdPrice * rate;
  }

  getCurrencySymbol(): string {
    return this.currencySymbols[this.currentCurrency() as keyof typeof this.currencySymbols] || '$';
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  handleAction(action: string, token?: any) {
    let targetToken = token || this.selectedToken();
    if (!targetToken) {
      if (action === 'Pay') {
        targetToken = this.tokens().find(t => t.id === 'nbx');
      } else {
        // Default to ETH for general actions if no token is selected
        targetToken = this.tokens().find(t => t.id === 'eth');
      }
    }
    
    if (action === 'Withdraw' || action === 'Send' || action === 'Pay') {
      if (targetToken && targetToken.id === 'nbx') {
        this.selectedToken.set(targetToken);
        this.showNbxTransferModal.set(true);
        return;
      }
      this.selectedToken.set(targetToken);
      this.showWithdrawModal.set(true);
      return;
    }
    
    if (action === 'Deposit' || action === 'Receive') {
      this.selectedToken.set(targetToken);
      this.showReceiveQR.set(true);
      return;
    }
    
    this.showToast(`${action} feature coming soon!`);
  }

  async estimateGas() {
    if (!this.withdrawAddress() || !this.withdrawAmount()) {
      this.estimatedGasFee.set('0.00');
      return;
    }
    this.isEstimatingGas.set(true);
    try {
      const response = await fetch('/api/wallet/estimate-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toAddress: this.withdrawAddress(),
          amount: this.withdrawAmount()
        })
      });
      const data = await response.json();
      this.estimatedGasFee.set(data.feeEth || '0.00');
    } catch (e) {
      this.estimatedGasFee.set('0.000021');
    } finally {
      this.isEstimatingGas.set(false);
    }
  }

  onWithdrawInput() {
    // Debounce gas estimation
    if ((window as any).gasTimeout) clearTimeout((window as any).gasTimeout);
    (window as any).gasTimeout = setTimeout(() => {
      this.estimateGas();
    }, 500);
  }

  async transferNbx() {
    if (!this.nbxTransferToId() || !this.nbxTransferAmount()) {
      this.showToast('Please enter Telegram ID and Amount');
      return;
    }
    
    this.showToast('Processing transfer...');
    try {
      const response = await fetch('/api/wallet/transfer-nbx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTelegramId: this.telegramUser().id.toString(),
          toTelegramId: this.nbxTransferToId(),
          amount: this.nbxTransferAmount()
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.showToast('NBX Transfer successful!');
        this.showNbxTransferModal.set(false);
        this.nbxTransferToId.set('');
        this.nbxTransferAmount.set(null);
        this.tokens.update(tokens => tokens.map(t => t.id === 'nbx' ? { ...t, balance: data.newBalance } : t));
        this.calculateTotalBalance();
      } else {
        this.showToast(data.error || 'Transfer failed');
      }
    } catch (e) {
      this.showToast('Network error during transfer');
    }
  }

  async completeTask(task: any) {
    if (task.completed) return;
    
    const user = this.telegramUser();
    if (!user) {
      this.showToast('User not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegram_id,
          taskId: task.id,
          reward: 20, // 20 NBX
          taskTitle: task.title
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showToast(`Task Completed! You earned 20 NBX.`);
        this.tasks.update(tasks => tasks.map(t => t.id === task.id ? { ...t, completed: true, action: 'Done' } : t));
        this.tokens.update(tokens => tokens.map(t => t.id === 'nbx' ? { ...t, balance: data.newBalance } : t));
        if (data.transaction) {
          this.transactions.update(txs => [data.transaction, ...txs]);
        }
        this.calculateTotalBalance();
      } else {
        this.showToast(data.error || 'Failed to complete task');
      }
    } catch (e) {
      this.showToast('Network error while completing task');
    }
  }

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  getTokenTransactions(tokenId: string) {
    return this.transactions().filter(tx => tx.tokenId === tokenId);
  }

  getNbxBalance() {
    const nbx = this.tokens().find(t => t.id === 'nbx');
    return nbx ? nbx.balance : 0;
  }

  copyAddress() {
    if (this.evmWallet()) {
      navigator.clipboard.writeText(this.evmWallet().address);
      this.showToast('Wallet address copied!');
    }
  }

  copyReferralLink() {
    const link = `https://t.me/NoblixBot?start=${this.telegramUser()?.id || 'demo'}`;
    navigator.clipboard.writeText(link).then(() => {
      this.showToast('Referral link copied!');
    }).catch(() => {
      this.showToast('Failed to copy link');
    });
  }

  toggleSetting(setting: string) {
    if (setting === 'notifications') this.notificationsEnabled.set(!this.notificationsEnabled());
    if (setting === 'biometrics') this.biometricsEnabled.set(!this.biometricsEnabled());
  }

  handleWalletAction(action: string) {
    if (action === 'Language') {
      const langs = ['en', 'hi', 'bn', 'ru'];
      const currentIndex = langs.indexOf(this.currentLanguage());
      const nextIndex = (currentIndex + 1) % langs.length;
      this.currentLanguage.set(langs[nextIndex]);
      this.showToast(`Language changed to ${langs[nextIndex].toUpperCase()}`);
      return;
    }
    if (action === 'Currency') {
      const currs = ['USD', 'EUR', 'INR', 'BDT'];
      const currentIndex = currs.indexOf(this.currentCurrency());
      const nextIndex = (currentIndex + 1) % currs.length;
      this.currentCurrency.set(currs[nextIndex]);
      this.calculateTotalBalance();
      this.showToast(`Currency changed to ${currs[nextIndex]}`);
      return;
    }
    this.handleAction(action);
  }

  toggleBalanceVisibility() {
    this.isBalanceHidden.set(!this.isBalanceHidden());
  }

  openAdminPanel() {
    this.showAdminPanel.set(true);
  }

  closeAdminPanel() {
    this.showAdminPanel.set(false);
  }

  setAdminTab(tab: string) {
    this.adminTab.set(tab);
  }

  updateNewTaskTitle(event: any) {
    this.newTaskTitle.set(event.target.value);
  }

  updateNewTaskReward(event: any) {
    this.newTaskReward.set(event.target.value);
  }

  addTask() {
    if (this.newTaskTitle() && this.newTaskReward()) {
      this.tasks.update(t => [...t, {
        id: Date.now(),
        title: this.newTaskTitle(),
        reward: this.newTaskReward(),
        action: 'Start',
        completed: false,
        type: this.newTaskType()
      }]);
      this.newTaskTitle.set('');
      this.newTaskReward.set('');
      this.showToast('Task added successfully');
    }
  }

  removeTask(id: number) {
    this.tasks.update(t => t.filter(task => task.id !== id));
    this.showToast('Task removed');
  }

  sendNotification() {
    const text = (document.getElementById('adminNotifText') as HTMLTextAreaElement)?.value;
    if (text) {
      this.notifications.update(n => [{ id: Date.now(), title: 'Admin Message', message: text, date: new Date(), read: false }, ...n]);
      this.showToast('Notification sent to all users');
      (document.getElementById('adminNotifText') as HTMLTextAreaElement).value = '';
    } else {
      this.showToast('Please enter a message');
    }
  }

  getUnreadCount() {
    return this.notifications().filter(n => !n.read).length;
  }

  openNotifications() {
    this.showNotifications.set(true);
    this.notifications.update(n => n.map(x => ({ ...x, read: true })));
  }

  closeNotifications() {
    this.showNotifications.set(false);
  }
}
