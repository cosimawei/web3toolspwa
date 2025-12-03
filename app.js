// ==================== Storage Keys ====================
const STORAGE_KEYS = {
  CRYPTO: 'pwa_customCrypto',
  ALPHA: 'pwa_customAlpha',
  MEME: 'pwa_customMeme',
  STOCK: 'pwa_customStock',
  TAB_VISIBILITY: 'pwa_tabVisibility',
  CRYPTO_ORDER: 'pwa_cryptoOrder',
  ALPHA_ORDER: 'pwa_alphaOrder',
  MEME_ORDER: 'pwa_memeOrder',
  STOCK_ORDER: 'pwa_stockOrder'
};

// ==================== Default Data ====================
const DEFAULT_CRYPTO = [
  { symbol: 'BTCUSDT', name: 'BTC', icon: '₿', source: 'binance', tradingPair: 'BTCUSDT' },
  { symbol: 'ETHUSDT', name: 'ETH', icon: 'Ξ', source: 'binance', tradingPair: 'ETHUSDT' },
  { symbol: 'SOLUSDT', name: 'SOL', icon: '◎', source: 'binance', tradingPair: 'SOLUSDT' },
  { symbol: 'BNBUSDT', name: 'BNB', icon: '🔶', source: 'binance', tradingPair: 'BNBUSDT' },
  { symbol: 'XRPUSDT', name: 'XRP', icon: '✕', source: 'binance', tradingPair: 'XRPUSDT' },
  { symbol: 'ADAUSDT', name: 'ADA', icon: '₳', source: 'binance', tradingPair: 'ADAUSDT' }
];

const DEFAULT_STOCKS = [
  { symbol: 'sh000001', name: '上证指数', icon: '📊', source: 'cn', tradingPair: 'sh000001' },
  { symbol: 'usIXIC', name: '纳斯达克', icon: '📈', source: 'us', tradingPair: 'usIXIC' }
];

const DEFAULT_METALS = [
  { symbol: 'XAUUSD', name: '黄金', icon: '🥇', source: 'metal', tradingPair: 'XAUUSD' },
  { symbol: 'XAGUSD', name: '白银', icon: '🥈', source: 'metal', tradingPair: 'XAGUSD' }
];

// ==================== Global State ====================
let wsConnections = {};
let pollingIntervals = {};
let priceData = {};
let currentTab = 'crypto';

let cryptoList = [];
let alphaList = [];
let memeList = [];
let stockList = [];
let metalList = [...DEFAULT_METALS];

const EXCHANGE_ICONS = { binance: '🔶', okx: '⚫', bitget: '🟢', mexc: '🔵' };
const MARKET_FLAGS = { cn: '🇨🇳', hk: '🇭🇰', us: '🇺🇸' };
const NETWORK_NAMES = { bsc: 'BSC', eth: 'ETH', sol: 'SOL', base: 'Base' };

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  setupEventListeners();
  applyTabVisibility();
  renderAllPanels();
  connectAll();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
  }
}

// ==================== Event Listeners ====================
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Header buttons
  document.getElementById('refreshBtn').addEventListener('click', refreshAll);
  document.getElementById('settingsBtn').addEventListener('click', () => toggleModal('settingsModal', true));
  document.getElementById('tradingviewBtn').addEventListener('click', () => window.open('https://www.tradingview.com/chart/', '_blank'));

  // Close buttons
  document.getElementById('closeChart').addEventListener('click', () => toggleModal('chartModal', false));
  document.getElementById('closeSettings').addEventListener('click', () => {
    saveSettings();
    toggleModal('settingsModal', false);
  });

  // Add buttons
  document.getElementById('addCryptoBtn').addEventListener('click', addCrypto);
  document.getElementById('addAlphaBtn').addEventListener('click', addAlpha);
  document.getElementById('addMemeBtn').addEventListener('click', addMeme);
  document.getElementById('addStockBtn').addEventListener('click', addStock);

  // Export/Import
  document.getElementById('exportBtn').addEventListener('click', exportConfig);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importConfig);

  // Close modals on backdrop click
  document.getElementById('chartModal').addEventListener('click', (e) => {
    if (e.target.id === 'chartModal') toggleModal('chartModal', false);
  });
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
      saveSettings();
      toggleModal('settingsModal', false);
    }
  });
}

// ==================== Data Loading ====================
function loadAllData() {
  // Load crypto
  const savedCrypto = JSON.parse(localStorage.getItem(STORAGE_KEYS.CRYPTO) || '[]');
  cryptoList = [...DEFAULT_CRYPTO, ...savedCrypto];

  // Load alpha
  alphaList = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALPHA) || '[]');

  // Load meme
  memeList = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEME) || '[]');

  // Load stocks
  const savedStocks = JSON.parse(localStorage.getItem(STORAGE_KEYS.STOCK) || '[]');
  stockList = [...DEFAULT_STOCKS, ...savedStocks];

  // Load tab visibility
  const visibility = JSON.parse(localStorage.getItem(STORAGE_KEYS.TAB_VISIBILITY) || '{}');
  document.getElementById('showCrypto').checked = visibility.crypto !== false;
  document.getElementById('showAlpha').checked = visibility.alpha !== false;
  document.getElementById('showMeme').checked = visibility.meme !== false;
  document.getElementById('showStock').checked = visibility.stock !== false;
  document.getElementById('showMetal').checked = visibility.metal !== false;
}

function saveSettings() {
  const visibility = {
    crypto: document.getElementById('showCrypto').checked,
    alpha: document.getElementById('showAlpha').checked,
    meme: document.getElementById('showMeme').checked,
    stock: document.getElementById('showStock').checked,
    metal: document.getElementById('showMetal').checked
  };
  localStorage.setItem(STORAGE_KEYS.TAB_VISIBILITY, JSON.stringify(visibility));
  applyTabVisibility();
}

function applyTabVisibility() {
  const visibility = JSON.parse(localStorage.getItem(STORAGE_KEYS.TAB_VISIBILITY) || '{}');
  const tabs = ['crypto', 'alpha', 'meme', 'stock', 'metal'];
  let firstVisible = null;

  tabs.forEach(tab => {
    const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    const isVisible = visibility[tab] !== false;
    if (btn) btn.style.display = isVisible ? '' : 'none';
    if (isVisible && !firstVisible) firstVisible = tab;
  });

  if (firstVisible && visibility[currentTab] === false) {
    switchTab(firstVisible);
  }
}

// ==================== Tab Switching ====================
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tab}`);
  });
}

// ==================== Rendering ====================
function renderAllPanels() {
  renderPanel('crypto-grid', cryptoList, 'crypto');
  renderPanel('alpha-grid', alphaList, 'alpha');
  renderPanel('meme-grid', memeList, 'meme');
  renderPanel('stock-grid', stockList, 'stock');
  renderPanel('metal-grid', metalList, 'metal');
  renderSettingsLists();
}

function renderPanel(gridId, list, type) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-hint">暂无数据，点击设置添加</div>';
    return;
  }

  grid.innerHTML = list.map(item => {
    const sourceIcon = item.source && item.source !== 'binance' && type === 'crypto'
      ? `<span class="source-badge">${EXCHANGE_ICONS[item.source] || ''}</span>` : '';
    const marketFlag = type === 'stock' && MARKET_FLAGS[item.source]
      ? `<span class="source-badge">${MARKET_FLAGS[item.source]}</span>` : '';
    const noteIcon = (type === 'alpha' || type === 'meme') && item.note
      ? '<span class="note-indicator">📝</span>' : '';

    return `
      <div class="coin-card" data-symbol="${item.symbol}" data-type="${type}">
        <div class="coin-card-header">
          <span class="coin-card-icon">${item.icon || '🪙'}</span>
          <span class="coin-card-name">${item.name}</span>
          ${sourceIcon}${marketFlag}${noteIcon}
        </div>
        <div class="coin-card-price" id="price-${item.symbol}">
          <span class="coin-card-loading">加载中...</span>
        </div>
        <div class="coin-card-change" id="change-${item.symbol}">--</div>
      </div>
    `;
  }).join('');

  // Add click handlers
  grid.querySelectorAll('.coin-card').forEach(card => {
    card.addEventListener('click', () => {
      const symbol = card.dataset.symbol;
      const type = card.dataset.type;
      const item = getItemBySymbol(symbol, type);
      if (item) openChart(item, type);
    });
  });
}

function getItemBySymbol(symbol, type) {
  const lists = { crypto: cryptoList, alpha: alphaList, meme: memeList, stock: stockList, metal: metalList };
  return lists[type]?.find(i => i.symbol === symbol);
}

function renderSettingsLists() {
  // Crypto list
  const cryptoListEl = document.getElementById('cryptoList');
  const customCrypto = cryptoList.filter(c => !DEFAULT_CRYPTO.find(d => d.symbol === c.symbol));
  cryptoListEl.innerHTML = customCrypto.map(c => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">${c.name} <span class="source-badge">${EXCHANGE_ICONS[c.source] || ''}</span></div>
        <div class="list-item-detail">${c.tradingPair}</div>
      </div>
      <button class="delete-btn" onclick="deleteCrypto('${c.symbol}')">删除</button>
    </div>
  `).join('') || '<div class="list-item-detail">暂无自定义代币</div>';

  // Alpha list
  const alphaListEl = document.getElementById('alphaList');
  alphaListEl.innerHTML = alphaList.map(c => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">${c.name}</div>
        <div class="list-item-detail">${c.note || '--'}</div>
      </div>
      <button class="delete-btn" onclick="deleteAlpha('${c.symbol}')">删除</button>
    </div>
  `).join('') || '<div class="list-item-detail">暂无Alpha代币</div>';

  // MEME list
  const memeListEl = document.getElementById('memeList');
  memeListEl.innerHTML = memeList.map(c => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">${c.name} <span class="source-badge">${NETWORK_NAMES[c.network] || ''}</span></div>
        <div class="list-item-detail">${c.contractAddress?.slice(0, 10)}...${c.contractAddress?.slice(-6)}</div>
      </div>
      <button class="delete-btn" onclick="deleteMeme('${c.symbol}')">删除</button>
    </div>
  `).join('') || '<div class="list-item-detail">暂无MEME币</div>';

  // Stock list
  const stockListEl = document.getElementById('stockList');
  const customStocks = stockList.filter(s => !DEFAULT_STOCKS.find(d => d.symbol === s.symbol));
  stockListEl.innerHTML = customStocks.map(s => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-name">${s.name} ${MARKET_FLAGS[s.source] || ''}</div>
        <div class="list-item-detail">${s.tradingPair}</div>
      </div>
      <button class="delete-btn" onclick="deleteStock('${s.symbol}')">删除</button>
    </div>
  `).join('') || '<div class="list-item-detail">暂无自定义股票</div>';
}

// ==================== Data Connections ====================
function connectAll() {
  connectCrypto();
  if (alphaList.length > 0) startAlphaPolling();
  if (memeList.length > 0) startMemePolling();
  if (stockList.length > 0) startStockPolling();
  startMetalPolling();
}

function refreshAll() {
  closeAllConnections();
  renderAllPanels();
  connectAll();
  showToast('已刷新');
}

function closeAllConnections() {
  Object.values(wsConnections).forEach(ws => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  });
  wsConnections = {};
  Object.values(pollingIntervals).forEach(id => clearInterval(id));
  pollingIntervals = {};
}

// ==================== Crypto Connections ====================
function connectCrypto() {
  const byExchange = { binance: [], okx: [], bitget: [], mexc: [] };
  cryptoList.forEach(coin => {
    const src = coin.source || 'binance';
    if (byExchange[src]) byExchange[src].push(coin);
  });

  byExchange.binance.forEach(c => connectBinanceWS(c));
  if (byExchange.okx.length > 0) connectOkxWS(byExchange.okx);
  if (byExchange.bitget.length > 0) connectBitgetWS(byExchange.bitget);
  if (byExchange.mexc.length > 0) startMexcPolling(byExchange.mexc);
}

function connectBinanceWS(coin) {
  const sym = coin.symbol;
  if (wsConnections[sym]) {
    try { wsConnections[sym].close(); } catch(e) {}
  }

  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${coin.tradingPair.toLowerCase()}@ticker`);
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    priceData[sym] = { price: parseFloat(d.c), changePercent: parseFloat(d.P) };
    updateCard(sym);
  };
  ws.onclose = () => {
    if (wsConnections[sym] === ws) {
      setTimeout(() => connectBinanceWS(coin), 5000);
    }
  };
  wsConnections[sym] = ws;
}

function connectOkxWS(coins) {
  if (wsConnections['okx']) wsConnections['okx'].close();
  const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
  ws.onopen = () => {
    ws.send(JSON.stringify({ op: 'subscribe', args: coins.map(c => ({ channel: 'tickers', instId: c.tradingPair })) }));
  };
  ws.onmessage = e => {
    const r = JSON.parse(e.data);
    if (r.data?.[0]) {
      const d = r.data[0];
      const coin = coins.find(c => c.tradingPair === d.instId);
      if (coin) {
        const change = d.sodUtc8 ? ((parseFloat(d.last) - parseFloat(d.sodUtc8)) / parseFloat(d.sodUtc8) * 100) : 0;
        priceData[coin.symbol] = { price: parseFloat(d.last), changePercent: change };
        updateCard(coin.symbol);
      }
    }
  };
  ws.onclose = () => setTimeout(() => connectOkxWS(coins), 5000);
  wsConnections['okx'] = ws;
}

function connectBitgetWS(coins) {
  if (wsConnections['bitget']) wsConnections['bitget'].close();
  const ws = new WebSocket('wss://ws.bitget.com/v2/ws/public');
  ws.onopen = () => {
    ws.send(JSON.stringify({ op: 'subscribe', args: coins.map(c => ({ instType: 'SPOT', channel: 'ticker', instId: c.tradingPair })) }));
  };
  ws.onmessage = e => {
    const r = JSON.parse(e.data);
    if (r.data?.[0]) {
      const d = r.data[0];
      const coin = coins.find(c => c.tradingPair === d.instId);
      if (coin) {
        priceData[coin.symbol] = { price: parseFloat(d.lastPr), changePercent: parseFloat(d.changeUtc24h) * 100 };
        updateCard(coin.symbol);
      }
    }
  };
  ws.onclose = () => setTimeout(() => connectBitgetWS(coins), 5000);
  wsConnections['bitget'] = ws;
}

function startMexcPolling(coins) {
  const fetchData = async () => {
    for (const c of coins) {
      try {
        const r = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${c.tradingPair}`);
        if (r.ok) {
          const d = await r.json();
          priceData[c.symbol] = { price: parseFloat(d.lastPrice), changePercent: parseFloat(d.priceChangePercent) };
          updateCard(c.symbol);
        }
      } catch (e) {}
    }
  };
  fetchData();
  pollingIntervals['mexc'] = setInterval(fetchData, 5000);
}

// ==================== Alpha Polling ====================
function startAlphaPolling() {
  const fetchData = async () => {
    try {
      const r = await fetch('https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/cex/alpha/all/token/list');
      if (r.ok) {
        const data = await r.json();
        if (data?.data) {
          for (const c of alphaList) {
            const token = data.data.find(t => {
              if (c.tokenId && t.id === c.tokenId) return true;
              return t.symbol?.toUpperCase() === c.name.toUpperCase();
            });
            if (token?.price) {
              priceData[c.symbol] = {
                price: parseFloat(token.price),
                changePercent: parseFloat(token.priceChange24h) || 0
              };
              updateCard(c.symbol);
            }
          }
        }
      }
    } catch (e) {}
  };
  fetchData();
  pollingIntervals['alpha'] = setInterval(fetchData, 10000);
}

// ==================== MEME Polling ====================
function startMemePolling() {
  const fetchData = async () => {
    for (const c of memeList) {
      if (!c.contractAddress) continue;
      try {
        const networkMap = { bsc: 'bsc', eth: 'eth', sol: 'solana', base: 'base' };
        const network = networkMap[c.network?.toLowerCase()] || 'bsc';
        const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${c.contractAddress}`);
        if (r.ok) {
          const data = await r.json();
          const attrs = data?.data?.attributes;
          if (attrs) {
            priceData[c.symbol] = {
              price: parseFloat(attrs.price_usd) || 0,
              changePercent: parseFloat(attrs.price_change_percentage?.h24) || 0
            };
            updateCard(c.symbol);
          }
        }
      } catch (e) {}
    }
  };
  fetchData();
  pollingIntervals['meme'] = setInterval(fetchData, 15000);
}

// ==================== Stock Polling ====================
function startStockPolling() {
  const fetchData = async () => {
    for (const stock of stockList) {
      try {
        const r = await fetch(`https://qt.gtimg.cn/q=${stock.tradingPair}`);
        if (r.ok) {
          const buffer = await r.arrayBuffer();
          const text = new TextDecoder('gbk').decode(buffer);
          const parts = text.split('~');
          if (parts.length > 32) {
            const price = parseFloat(parts[3]);
            const isUS = stock.tradingPair.startsWith('us');
            const change = parseFloat(parts[isUS ? 31 : 32]);
            priceData[stock.symbol] = { price, changePercent: change, isStock: true, isUS };
            updateCard(stock.symbol);
          }
        }
      } catch (e) {}
    }
  };
  fetchData();
  pollingIntervals['stock'] = setInterval(fetchData, 10000);
}

// ==================== Metal Polling ====================
function startMetalPolling() {
  const fetchData = async () => {
    try {
      // Gold from Binance PAXG
      const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT');
      if (r.ok) {
        const d = await r.json();
        priceData['XAUUSD'] = {
          price: parseFloat(d.lastPrice),
          changePercent: parseFloat(d.priceChangePercent),
          cnPrice: parseFloat(d.lastPrice) / 31.1035 * 7.1
        };
        updateMetalCard('XAUUSD');
      }
    } catch (e) {}

    // Silver placeholder
    const silverEl = document.getElementById('price-XAGUSD');
    if (silverEl && !priceData['XAGUSD']) {
      silverEl.innerHTML = '<span style="font-size:11px;color:rgba(255,255,255,0.5)">点击查看K线</span>';
    }
  };
  fetchData();
  pollingIntervals['metal'] = setInterval(fetchData, 60000);
}

// ==================== UI Updates ====================
function updateCard(symbol) {
  const data = priceData[symbol];
  if (!data) return;

  const priceEl = document.getElementById(`price-${symbol}`);
  const changeEl = document.getElementById(`change-${symbol}`);
  if (!priceEl || !changeEl) return;

  const prefix = data.isStock ? (data.isUS ? '$' : '¥') : '$';
  priceEl.textContent = `${prefix}${formatPrice(data.price)}`;

  const pos = data.changePercent >= 0;
  changeEl.className = `coin-card-change ${pos ? 'positive' : 'negative'}`;
  changeEl.textContent = `${pos ? '+' : ''}${data.changePercent.toFixed(2)}%`;
}

function updateMetalCard(symbol) {
  const data = priceData[symbol];
  if (!data) return;

  const priceEl = document.getElementById(`price-${symbol}`);
  const changeEl = document.getElementById(`change-${symbol}`);
  if (!priceEl || !changeEl) return;

  let html = `$${formatPrice(data.price)}`;
  if (data.cnPrice) {
    html += `<br><span style="font-size:11px;color:rgba(255,255,255,0.6)">¥${formatPrice(data.cnPrice)}/克</span>`;
  }
  priceEl.innerHTML = html;

  const pos = data.changePercent >= 0;
  changeEl.className = `coin-card-change ${pos ? 'positive' : 'negative'}`;
  changeEl.textContent = `${pos ? '+' : ''}${data.changePercent.toFixed(2)}%`;
}

function formatPrice(p) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toFixed(8);
}

// ==================== Chart ====================
function openChart(item, type) {
  const modal = document.getElementById('chartModal');
  const title = document.getElementById('chartTitle');
  const container = document.getElementById('chartContainer');

  title.textContent = item.name;
  modal.classList.add('show');

  if (type === 'alpha' || type === 'meme') {
    const network = item.network || 'bsc';
    const address = item.contractAddress;
    if (address) {
      container.innerHTML = `
        <div class="debot-link">
          <p>${type === 'alpha' ? 'Alpha' : 'MEME'}代币K线请在Debot查看</p>
          <a href="https://debot.ai/token/${network}/${address}" target="_blank">🔗 打开Debot</a>
        </div>
      `;
    } else {
      container.innerHTML = '<div class="debot-link"><p>暂无合约地址</p></div>';
    }
    return;
  }

  let tvSymbol, interval = '15';

  if (type === 'crypto') {
    const exMap = { binance: 'BINANCE', okx: 'OKX', bitget: 'BITGET', mexc: 'MEXC' };
    tvSymbol = `${exMap[item.source] || 'BINANCE'}:${item.name}USDT`;
  } else if (type === 'stock') {
    const code = item.tradingPair;
    if (code.startsWith('sh')) {
      tvSymbol = `SSE:${code.slice(2)}`;
      interval = 'D';
    } else if (code.startsWith('sz')) {
      tvSymbol = `SZSE:${code.slice(2)}`;
      interval = 'D';
    } else if (code.startsWith('hk')) {
      container.innerHTML = `
        <div class="debot-link">
          <p>港股K线请在TradingView查看</p>
          <a href="https://www.tradingview.com/chart/?symbol=HKEX:${code.slice(2).replace(/^0+/, '')}" target="_blank">🔗 打开TradingView</a>
        </div>
      `;
      return;
    } else if (code.startsWith('us')) {
      tvSymbol = code.slice(2);
    } else {
      tvSymbol = code;
    }
  } else if (type === 'metal') {
    tvSymbol = item.symbol === 'XAUUSD' ? 'TVC:GOLD' : 'TVC:SILVER';
  }

  container.innerHTML = `<iframe src="https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(tvSymbol)}&interval=${interval}&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=ffffff&theme=dark&style=1&timezone=Asia%2FShanghai&locale=zh_CN"></iframe>`;
}

// ==================== Add Functions ====================
function addCrypto() {
  const exchange = document.getElementById('cryptoExchange').value;
  const symbol = document.getElementById('cryptoSymbol').value.trim().toUpperCase();
  if (!symbol) return showToast('请输入代币符号');

  const tradingPair = exchange === 'okx' ? `${symbol}-USDT` : `${symbol}USDT`;
  const key = exchange === 'binance' ? tradingPair : `${exchange.toUpperCase()}_${tradingPair.replace('-', '')}`;

  if (cryptoList.find(c => c.symbol === key)) return showToast('代币已存在');

  const newCoin = { symbol: key, name: symbol, icon: '🪙', source: exchange, tradingPair };
  cryptoList.push(newCoin);
  saveCustomCrypto();
  renderAllPanels();
  connectBinanceWS(newCoin);

  document.getElementById('cryptoSymbol').value = '';
  showToast('添加成功');
}

function addAlpha() {
  const symbol = document.getElementById('alphaSymbol').value.trim();
  const note = document.getElementById('alphaNote').value.trim();
  if (!symbol) return showToast('请输入代币符号');

  const key = `ALPHA_${symbol.toUpperCase()}_${Date.now()}`;
  if (alphaList.find(c => c.name.toUpperCase() === symbol.toUpperCase())) return showToast('代币已存在');

  alphaList.push({ symbol: key, name: symbol, icon: '🅰️', source: 'alpha', note });
  localStorage.setItem(STORAGE_KEYS.ALPHA, JSON.stringify(alphaList));
  renderAllPanels();
  if (alphaList.length === 1) startAlphaPolling();

  document.getElementById('alphaSymbol').value = '';
  document.getElementById('alphaNote').value = '';
  showToast('添加成功');
}

function addMeme() {
  const network = document.getElementById('memeNetwork').value;
  const name = document.getElementById('memeName').value.trim();
  const contract = document.getElementById('memeContract').value.trim().toLowerCase();

  if (!name) return showToast('请输入名称');
  if (!contract) return showToast('请输入合约地址');

  const key = `MEME_${network.toUpperCase()}_${contract.slice(-8).toUpperCase()}`;
  if (memeList.find(c => c.contractAddress === contract)) return showToast('代币已存在');

  memeList.push({ symbol: key, name, icon: '🐸', source: 'meme', network, contractAddress: contract });
  localStorage.setItem(STORAGE_KEYS.MEME, JSON.stringify(memeList));
  renderAllPanels();
  if (memeList.length === 1) startMemePolling();

  document.getElementById('memeName').value = '';
  document.getElementById('memeContract').value = '';
  showToast('添加成功');
}

function addStock() {
  const market = document.getElementById('stockMarket').value;
  let code = document.getElementById('stockCode').value.trim().toUpperCase();
  if (!code) return showToast('请输入股票代码');

  let tradingPair;
  if (market === 'cn') {
    const prefix = code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz';
    tradingPair = `${prefix}${code}`;
  } else if (market === 'hk') {
    tradingPair = `hk${code.padStart(5, '0')}`;
  } else {
    tradingPair = `us${code}`;
  }

  if (stockList.find(s => s.tradingPair === tradingPair)) return showToast('股票已存在');

  stockList.push({ symbol: tradingPair, name: code, icon: '📊', source: market, tradingPair });
  saveCustomStocks();
  renderAllPanels();

  document.getElementById('stockCode').value = '';
  showToast('添加成功');
}

// ==================== Delete Functions ====================
window.deleteCrypto = function(symbol) {
  cryptoList = cryptoList.filter(c => c.symbol !== symbol);
  saveCustomCrypto();
  renderAllPanels();
  showToast('已删除');
};

window.deleteAlpha = function(symbol) {
  alphaList = alphaList.filter(c => c.symbol !== symbol);
  localStorage.setItem(STORAGE_KEYS.ALPHA, JSON.stringify(alphaList));
  renderAllPanels();
  showToast('已删除');
};

window.deleteMeme = function(symbol) {
  memeList = memeList.filter(c => c.symbol !== symbol);
  localStorage.setItem(STORAGE_KEYS.MEME, JSON.stringify(memeList));
  renderAllPanels();
  showToast('已删除');
};

window.deleteStock = function(symbol) {
  stockList = stockList.filter(s => s.symbol !== symbol);
  saveCustomStocks();
  renderAllPanels();
  showToast('已删除');
};

// ==================== Save Functions ====================
function saveCustomCrypto() {
  const custom = cryptoList.filter(c => !DEFAULT_CRYPTO.find(d => d.symbol === c.symbol));
  localStorage.setItem(STORAGE_KEYS.CRYPTO, JSON.stringify(custom));
}

function saveCustomStocks() {
  const custom = stockList.filter(s => !DEFAULT_STOCKS.find(d => d.symbol === s.symbol));
  localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(custom));
}

// ==================== Export/Import ====================
function exportConfig() {
  const config = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    data: {
      crypto: JSON.parse(localStorage.getItem(STORAGE_KEYS.CRYPTO) || '[]'),
      alpha: alphaList,
      meme: memeList,
      stock: JSON.parse(localStorage.getItem(STORAGE_KEYS.STOCK) || '[]'),
      tabVisibility: JSON.parse(localStorage.getItem(STORAGE_KEYS.TAB_VISIBILITY) || '{}')
    }
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `asset-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('配置已导出');
}

function importConfig(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const config = JSON.parse(ev.target.result);
      if (!config.data) throw new Error('Invalid format');

      if (config.data.crypto) localStorage.setItem(STORAGE_KEYS.CRYPTO, JSON.stringify(config.data.crypto));
      if (config.data.alpha) localStorage.setItem(STORAGE_KEYS.ALPHA, JSON.stringify(config.data.alpha));
      if (config.data.meme) localStorage.setItem(STORAGE_KEYS.MEME, JSON.stringify(config.data.meme));
      if (config.data.stock) localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(config.data.stock));
      if (config.data.tabVisibility) localStorage.setItem(STORAGE_KEYS.TAB_VISIBILITY, JSON.stringify(config.data.tabVisibility));

      showToast('导入成功，刷新中...');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      showToast('导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ==================== Utils ====================
function toggleModal(id, show) {
  document.getElementById(id).classList.toggle('show', show);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', closeAllConnections);
