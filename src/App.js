import { useState, useEffect, useRef } from 'react';
import { JsonRpcProvider, BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import './App.css';
import boost1 from './assets/boost1.png';
import boost2 from './assets/boost2.png';
import boost3 from './assets/boost3.png';
import boost4 from './assets/boost4.png';
import logo from './assets/Zenchain.png';
// === Set Contract Address and ABI ===
const CONTRACT_ADDRESS = "0x5e19FEbbE59FC45D559c5Ecaf88dca213d7901E8";
const ABI = [
  {
    "inputs": [],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Boost options
const BOOST_OPTIONS = [
  { level: 1, price: 0, img: boost1, title: "Boost x2", desc: "Mine 2x faster. Great for starters!" },
  { level: 2, price: 900, img: boost2, title: "Boost x4", desc: "4x faster, much more efficient." },
  { level: 3, price: 1200, img: boost3, title: "Boost x6", desc: "6x power for pro miners." },
  { level: 4, price: 1500, img: boost4, title: "Boost x8", desc: "8x mining, maximum speed." },
];

function App() {
  // --- States ---
  
  const  [walletAddress, setWalletAddress] = useState(null);
  const [showWalletAlert, setShowWalletAlert] = useState(false);
  const [nativeBalance, setNativeBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [fee] = useState(0.01);
  const [miningError, setMiningError] = useState(null);
  // --- Boost ---
  const [boostLevel, setBoostLevel] = useState(1);
  const [boosting, setBoosting] = useState(false);
  const [boostError, setBoostError] = useState("");
  const [boostSuccess, setBoostSuccess] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    // Handle wallet disconnect events
    if (!window.ethereum) return;
    const handleDisconnect = () => logoutWallet();
    window.ethereum.on('accountsChanged', handleDisconnect);
    window.ethereum.on('chainChanged', handleDisconnect);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleDisconnect);
      window.ethereum.removeListener('chainChanged', handleDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!walletAddress && isMining) {
      setIsMining(false);
      setTokens(0);
      setBoostLevel(1);
    }
  }, [walletAddress, isMining]);

  const fetchNativeBalance = async (addr = walletAddress) => {
    if (!addr) { setNativeBalance(0); return 0; }
    try {
      const provider = new JsonRpcProvider("https://zenchain-testnet.api.onfinality.io/public");
      const raw = await provider.getBalance(addr);
      const ztc = Number(formatUnits(raw, 18));
      setNativeBalance(ztc);
      return ztc;
    } catch(e) {
      setNativeBalance(0);
      return 0;
    }
  };

  const fetchTokenBalance = async (addr = walletAddress) => {
    if (!addr) { setTokenBalance(0); return 0; }
    try {
      const provider = new JsonRpcProvider("https://zenchain-testnet.api.onfinality.io/public");
      const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);
      let decimals = 18;
      try { decimals = await contract.decimals(); } catch (e) {}
      const raw = await contract.balanceOf(addr);
      const bal = Number(formatUnits(raw, decimals));
      setTokenBalance(bal);
      return bal;
    } catch (e) {
      setTokenBalance(0);
      return 0;
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
          setShowWalletAlert(true);
          setTokens(0);
          setTimeout(() => setShowWalletAlert(false), 2500);
          await fetchNativeBalance(accounts[0]);
          await fetchTokenBalance(accounts[0]);
        } else setWalletAddress(null);
      } catch (err) {
        setWalletAddress(null);
      }
    } else alert("Please install the MetaMask extension.");
  };

  const logoutWallet = () => {
    setWalletAddress(null);
    setIsMining(false);
    setTokens(0);
    setBoostLevel(1);
    setMiningError(null);
    setNativeBalance(0);
    setTokenBalance(0);
  };

  useEffect(() => {
    if (walletAddress) {
      fetchNativeBalance(walletAddress);
      fetchTokenBalance(walletAddress);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isMining) {
      intervalRef.current = setInterval(() => setTokens(prev => prev + boostLevel), 3000);
      return () => clearInterval(intervalRef.current);
    }
  }, [isMining, boostLevel]);
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleStartMining = () => {
    setAlertOpen(true);
    setMiningError(null);
  };

  const handleConfirmAlert = async () => {
    setAlertOpen(false);
    setMiningError(null);
    try {
      if (!window.ethereum || !walletAddress) return;
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.mint({ value: parseUnits(String(fee), 18) });
      await tx.wait();
      setIsMining(true);
      setTokens(0);
      setBoostLevel(1);
      await fetchNativeBalance(walletAddress);
      await fetchTokenBalance(walletAddress);
      setMiningError(null);
    } catch (err) {
      setMiningError("❌ Error: " +
        (err?.info?.error?.message ||
        err?.reason ||
        err?.message ||
        "Transaction failed.")
      );
    }
  };

  const handleCancelAlert = () => {
    setAlertOpen(false);
    setMiningError(null);
  };

  const handleStopMining = () => {
    setIsMining(false);
    setTokens(0);
    setBoostLevel(1);
  };

  const handleBuyBoost = async (boost) => {
    setBoosting(true);
    setBoostError("");
    setBoostSuccess("");
    if (!window.ethereum || !walletAddress) {
      setBoostError("Wallet not connected.");
      setBoosting(false);
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.mint({ value: parseUnits(String(boost.price), 18) });
      await tx.wait();
      setBoostLevel(boost.level);
      setBoostSuccess(`${boost.title} activated!`);
      await fetchNativeBalance(walletAddress);
      await fetchTokenBalance(walletAddress);
    } catch (e) {
      setBoostError("Error: " + (e?.reason || e?.message || "Transaction failed."));
    }
    setBoosting(false);
  };

  return (
    <div className="App">
      {}
      <div className="header-nav">
        <div className="logo-wrapper">
          <img src={logo} alt="ZEN Miner Logo" className="site-logo" />
        </div>
        <nav className="top-links">
          <a href="https://zenbridge.zenchain.io/" target="_blank" rel="noopener noreferrer">Bridge</a>
          <a href="https://node.zenchain.io/#/staking" target="_blank" rel="noopener noreferrer">Stake</a>
          <a href="https://zenchain.gmchains.xyz/" target="_blank" rel="noopener noreferrer">GM NFT</a>
        </nav>
        {walletAddress && (
          <button className="header-logout-btn" onClick={logoutWallet} title="Disconnect Wallet">
            <span className="logout-text">Log out</span>
          </button>
        )}
      </div>
      <div className="header-divider"></div>
      <header className="App-header">
        <div className="container">
          <h1>ZenChain Token Miner</h1>
          {}
          {(walletAddress && isMining) ? (
            <div className="main-flex-dashboard">
              {}
              <div className="mining-dashboard-box">
                <div className="token-counter" style={{ marginBottom: 12 }}>
                  Token Balance: <b>{nativeBalance}</b> <span className="ztc-unit">ZTC</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', justifyContent: 'center' }}>
                  <button
                    className="mine-button"
                    onClick={handleStartMining}
                    disabled={isMining}
                    style={{ marginBottom: '0' }}
                  >
                    {isMining ? "Mining..." : "Start Mining"}
                  </button>
                  {isMining && (
                    <button
                      className="stop-mining-button"
                      onClick={handleStopMining}
                    >
                      ⛔ Stop Mining
                    </button>
                  )}
                </div>
                <button className="withdraw-button" disabled>
                  Withdraw (Coming Soon)
                </button>
                <div className="token-counter">
                  Tokens mined: {tokens} <span className="ztc-unit">ZTC</span>
                  {boostLevel > 1 && (
                    <span style={{
                      background:'#232f4e',
                      color:'#aafafe',
                      borderRadius:7,
                      padding:'2px 10px',
                      fontWeight:700,
                      marginLeft:7,
                      fontSize:14
                    }}>
                      BOOST {boostLevel}x
                    </span>
                  )}
                </div>
              </div>
              {}
              <div className="boost-miner-cards">
                <h3 className="boost-miner-title">⏫ Boost Miner</h3>
                <div className="boost-cards-grid">
                  {BOOST_OPTIONS.map(boost => (
                    <div key={boost.level} className={"boost-card" + (boostLevel === boost.level ? " active" : "")}>
                      <img src={boost.img} alt={boost.title} className="boost-img" />
                      <div className="boost-title">{boost.title}</div>
                      <div className="boost-desc">{boost.desc}</div>
                      <div className="boost-speed">{boost.level}x speed</div>
                      <div className="boost-price">Price: <b>{boost.price} ZTC</b></div>
                      <button
                        className="boost-buy-btn"
                        onClick={() => handleBuyBoost(boost)}
                        disabled={boosting || boostLevel === boost.level}
                      >
                        {boostLevel === boost.level ? "Activated" : "Buy Boost"}
                      </button>
                    </div>
                  ))}
                </div>
                {boostError && <div className="boost-error">{boostError}</div>}
                {boostSuccess && <div className="boost-success">{boostSuccess}</div>}
              </div>
            </div>
          ) : (
            !walletAddress ? (
              <button className="mine-button" onClick={connectWallet}>
                Connect Wallet
              </button>
            ) : (
              <div>
                <div className="token-counter" style={{ marginBottom: 12 }}>
                  Token Balance: <b>{nativeBalance}</b> <span className="ztc-unit">ZTC</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', justifyContent: 'center' }}>
                  <button
                    className="mine-button"
                    onClick={handleStartMining}
                    disabled={isMining}
                    style={{ marginBottom: '0' }}
                  >
                    {isMining ? "Mining..." : "Start Mining"}
                  </button>
                  {isMining && (
                    <button
                      className="stop-mining-button"
                      onClick={handleStopMining}
                    >
                      ⛔ Stop Mining
                    </button>
                  )}
                </div>
                <button className="withdraw-button" disabled>
                  Withdraw (Coming Soon)
                </button>
                <div className="token-counter">
                  Tokens mined: {tokens} <span className="ztc-unit">ZTC</span>
                  {boostLevel > 1 && (
                    <span style={{
                      background:'#232f4e',
                      color:'#aafafe',
                      borderRadius:7,
                      padding:'2px 10px',
                      fontWeight:700,
                      marginLeft:7,
                      fontSize:14
                    }}>
                      BOOST {boostLevel}x
                    </span>
                  )}
                </div>
              </div>
            )
          )}
          {showWalletAlert && (
            <div className="alert-wallet">✅ Wallet connected!</div>
          )}
          {miningError && (
            <div className="mining-error-alert">
              {miningError}
            </div>
          )}
          {alertOpen && (
            <div className="zen-toast-alert-glassy">
              <div className="zen-toast-inner">
                <div className="zen-toast-title">Confirm Mining</div>
               
                <div className="zen-toast-row">
                  <span className="zen-toast-label">Fee</span>
                  <span className="zen-toast-value zen-toast-fee">
                    {fee} <span className="ztc-unit">ZTC</span>
                  </span>
                </div>
                
                <div className="zen-toast-buttons">
                  <button onClick={handleConfirmAlert} className="zen-toast-btn zen-toast-btn-confirm">Confirm</button>
                  <button onClick={handleCancelAlert} className="zen-toast-btn zen-toast-btn-cancel">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      <footer className="zen-short-footer">
        <div className="zen-short-footer-inner">
          <span className="zen-short-footer-title">ZenChain Miner</span>
          <span className="zen-short-footer-title">Vernox</span>
          <span className="zen-short-footer-copy">
            &copy; {new Date().getFullYear()} ZenChain
          </span>
        </div>
      </footer>
      {/* ======= BOOST GRID & MINING CARDS STYLE ======= */}
      <style>{`
        .main-flex-dashboard {
          display: flex;
          gap: 38px;
          align-items: flex-start;
          justify-content: center;
          margin: 42px auto 0 auto;
          max-width: 1100px;
          width: 98vw;
        }
        .mining-dashboard-box {
          background: linear-gradient(120deg, #1d2334 75%, #232f4eef 100%);
          border-radius: 20px;
          padding: 36px 32px 34px 32px;
          min-width: 300px;
          max-width: 370px;
          width: 100%;
          box-shadow: 0 8px 44px #19ffbb44, 0 2px 28px #1be3e922;
        }
        .boost-miner-cards {
          background: linear-gradient(129deg, #23294A 65%, #183569 100%);
          border-radius: 20px;
          padding: 28px 17px 16px 17px;
          min-width: 330px;
          max-width: 400px;
          width: 100%;
          border: 1.5px solid #11e8ff50;
          box-shadow: 0 6px 24px #21f8ee22;
        }
        .boost-miner-title {
          font-size: 1.16em;
          font-weight: 800;
          color: #0fffee;
          margin-bottom: 16px;
          margin-top: 0;
          letter-spacing: .03em;
          text-align: center;
          border-radius: 10px;
          background: linear-gradient(90deg, #16ffe3 20%, #eaff7b 87%);
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          filter: drop-shadow(0 0 8px #49fff466);
        }
        .boost-cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 19px;
          margin-bottom: 5px;
        }
        .boost-card {
          background: linear-gradient(120deg, #222a47ae 85%, #183f5bbf 100%);
          border-radius: 14px;
          box-shadow: 0 4px 18px #21e3fa33;
          text-align: center;
          padding: 19px 12px 13px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 2.5px solid transparent;
          transition: box-shadow 0.18s, border 0.17s;
          min-width: 0;
        }
        .boost-card.active,
        .boost-card:active,
        .boost-card:focus-within {
          box-shadow: 0 4px 28px #00fff84d;
          border-color: #1bd5f3;
          background: linear-gradient(100deg,#222e33c9 40%, #105d5fb0 100%);
        }
        .boost-img {
          width: 56px;
          margin-bottom: 11px;
          filter: drop-shadow(0 0 8px #1be3e985);
        }
        .boost-title {
          font-size: 1.09rem;
          font-weight: bold;
          color: #95e7ff;
          margin: 2px 0;
        }
        .boost-desc {
          font-size: .96rem;
          color: #b8d7f9;
          margin-bottom: 8px;
        }
        .boost-speed {
          color: #3fffc8;
          font-weight: 500;
          margin-bottom: 5px;
          font-size: .98rem;
        }
        .boost-price {
          font-size: .97rem;
          color: #ffed4a;
          font-weight: 600;
          margin-bottom: 7px;
          text-shadow: 0 0 9px #ffe4522d;
        }
        .boost-buy-btn {
          background: linear-gradient(88deg,#1be3e9 16%, #b6ff8d 96%);
          color: #00213A;
          border: none;
          border-radius: 11px;
          font-weight: 700;
          padding: 5px 18px;
          margin: 0 auto;
          font-size: 1.09rem;
          min-width: 85px;
          cursor: pointer;
          transition: background .14s, scale 0.13s;
          box-shadow: 0 1px 7px #93fff822;
        }
        .boost-buy-btn:active { scale: 0.97; }
        .boost-buy-btn[disabled] {
          background: #2c3755;
          color: #8fc3d2;
          opacity: 0.77;
          cursor: not-allowed;
        }
        .boost-error {
          color: #ff5858;
          text-align: center;
          margin-top: 10px;
          font-weight: 600;
        }
        .boost-success {
          color: #2cffcc;
          text-align: center;
          margin-top: 10px;
          font-weight: 600;
        }
        @media (max-width: 1000px) {
          .main-flex-dashboard { flex-direction: column; align-items: center; max-width: 98vw; gap: 20px;}
          .mining-dashboard-box, .boost-miner-cards {min-width: unset; max-width: 98vw;}
          .boost-cards-grid {grid-template-columns: 1fr; gap: 15px;}
        }
        @media (max-width: 640px) {
          .mining-dashboard-box, .boost-miner-cards {padding: 14px 3vw 18px 3vw;}
          .boost-miner-title {font-size: 1em;}
        }
      `}</style>
    </div>
  );
  
}

export default App;
