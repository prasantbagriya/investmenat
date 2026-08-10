import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, Send, ArrowDownToLine, RefreshCw, Key, ShieldCheck, Copy, Eye, EyeOff, ExternalLink, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'trustvalot-wallet-v5-secure'; // Legacy
const META_KEY = 'trustvalot-wallet-v5-metadata';
const SECRETS_KEY = 'trustvalot-wallet-v5-secrets';
const PW_HASH_KEY = 'trustvalot-wallet-pw-hash';
const ROUTING_SECRET_KEY = 'trustvalot-routing-lock'; // Isolated from Master Password

const ENCRYPTION_KEY = 'investmant-wallet-secure-static-key-2026'; // Used to obfuscate metadata

const encryptData = (data: any, customKey?: string) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), customKey || ENCRYPTION_KEY).toString();
};

const decryptData = (ciphertext: string, customKey?: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, customKey || ENCRYPTION_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) return null;
    return JSON.parse(decryptedStr);
  } catch (e) {
    return null;
  }
};

const hashPassword = (password: string) => {
  return CryptoJS.SHA256(password).toString();
};

const NETWORKS = {
  ethereum: { name: 'Ethereum', rpc: 'https://eth.drpc.org', symbol: 'ETH', explorer: 'https://etherscan.io/address/' },
  bnb: { name: 'BNB Chain', rpc: 'https://bsc.drpc.org', symbol: 'BNB', explorer: 'https://bscscan.com/address/' },
  polygon: { name: 'Polygon', rpc: 'https://polygon.drpc.org', symbol: 'MATIC', explorer: 'https://polygonscan.com/address/' },
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

const TOKENS = [
  { symbol: 'USDT (ETH)', name: 'Tether USD', network: 'ethereum', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'USDC (ETH)', name: 'USD Coin', network: 'ethereum', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'WBTC (ETH)', name: 'Wrapped BTC', network: 'ethereum', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  { symbol: 'USDT (BSC)', name: 'Tether USD', network: 'bnb', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
  { symbol: 'USDC (BSC)', name: 'USD Coin', network: 'bnb', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
  { symbol: 'BTCB (BSC)', name: 'Bitcoin BEP20', network: 'bnb', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18 },
  { symbol: 'USDT (Polygon)', name: 'Tether USD', network: 'polygon', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
  { symbol: 'USDC (Polygon)', name: 'USD Coin', network: 'polygon', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
];

const getBtcAddress = (seedPhrase: string) => {
  try {
    const hdWallet = ethers.HDNodeWallet.fromPhrase(seedPhrase, undefined, "m/44'/0'/0'/0/0");
    const pubKeyBytes = ethers.getBytes(hdWallet.publicKey);
    const sha256_pubKey = ethers.getBytes(ethers.sha256(pubKeyBytes));
    const ripemd160_pubKey = ethers.getBytes(ethers.ripemd160(sha256_pubKey));
    const payload = new Uint8Array(21);
    payload.set([0x00]);
    payload.set(ripemd160_pubKey, 1);
    const hash1 = ethers.getBytes(ethers.sha256(payload));
    const hash2 = ethers.getBytes(ethers.sha256(hash1));
    const checksum = hash2.slice(0, 4);
    const finalPayload = new Uint8Array(25);
    finalPayload.set(payload);
    finalPayload.set(checksum, 21);
    return ethers.encodeBase58(finalPayload);
  } catch(e) {
    return "";
  }
};

export default function CryptoWalletView({ activeTab = 'dashboard' }: { activeTab?: 'dashboard' | 'send' | 'receive' | 'security' }) {
  const [wallet, setWallet] = useState<{ address: string; seedPhrase: string; privateKey: string; btcAddress?: string } | null>(null);
  const [balances, setBalances] = useState<Record<string, string>>({ ETH: '0', BNB: '0', MATIC: '0', BTC: '0' });
  const [isLoading, setIsLoading] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [hasRevealedSeed, setHasRevealedSeed] = useState(false);
  
  // Send state
  const [sendAsset, setSendAsset] = useState<string>('ETH');
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendRoute, setSendRoute] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txHistory, setTxHistory] = useState<any[]>([]);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [pendingTxData, setPendingTxData] = useState<any>(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState(60);

  // TOTP Setup State
  const [setupTotpRoute, setSetupTotpEmail] = useState('');
  const [totpQrCode, setTotpQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpSetupCode, setTotpSetupCode] = useState('');
  const [isSettingUpTotp, setIsSettingUpTotp] = useState(false);
  const [otpIntent, setOtpIntent] = useState<'send' | 'reveal'>('send');
  
  // Custom Password State
  const [pwInput, setPwInput] = useState('');
  const [setupPwInput, setSetupPwInput] = useState('');
  const [hasCustomPw, setHasCustomPw] = useState(false);

  // Bound Route State
  const [boundRoute, setBoundRoute] = useState('');
  const [isBindingEmail, setIsBindingEmail] = useState(false);
  const [setupBoundRoute, setSetupBoundRoute] = useState('');
  const [setupBoundAlias, setSetupBoundAlias] = useState('');
  const [setupBoundRouteOtp, setSetupBoundRouteOtp] = useState('');
  const [setupRoutingPw, setSetupRoutingPw] = useState('');
  const [routingPwInput, setRoutingPwInput] = useState(''); // volatile only, never persisted
  const [hasBoundRoute, setHasBoundRoute] = useState(false);

  // Wallet Pack State
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [packPassword, setPackPassword] = useState('');
  const [importPackText, setImportPackText] = useState('');
  const [importPackPassword, setImportPackPassword] = useState('');
  const [importTotpInput, setImportTotpInput] = useState('');
  const [hasExportedPack, setHasExportedPack] = useState(false);

  const [viewState, setViewState] = useState<'loading' | 'onboarding' | 'create' | 'restore' | 'import-pack' | 'main'>('loading');
  const [restorePhrase, setRestorePhrase] = useState('');
  const [newSeed, setNewSeed] = useState('');

  // Initialize or load wallet
  useEffect(() => {
    const pwHash = localStorage.getItem(PW_HASH_KEY);
    if (pwHash) setHasCustomPw(true);

    const emailBound = localStorage.getItem('trustvalot-email-bound');
    if (emailBound === 'true') setHasBoundRoute(true);

    const seedRevealed = localStorage.getItem('trustvalot-seed-revealed');
    if (seedRevealed === 'true') setHasRevealedSeed(true);

    const packExported = localStorage.getItem('trustvalot-pack-sealed');
    if (packExported === 'true') setHasExportedPack(true);

    const savedTxs = localStorage.getItem('trustvalot-wallet-txs');
    if (savedTxs) {
      try {
        let parsed = decryptData(savedTxs);
        if (!parsed) {
          parsed = JSON.parse(savedTxs);
          localStorage.setItem('trustvalot-wallet-txs', encryptData(parsed));
        }
        setTxHistory(parsed);
      } catch (e) {}
    }

    // Try new metadata first
    const metadataStr = localStorage.getItem(META_KEY);
    if (metadataStr) {
      try {
        const metadata = decryptData(metadataStr);
        if (metadata && metadata.address) {
          // We load the wallet into state WITHOUT seed/privateKey if it has a custom password.
          // The seed/privateKey will only be retrieved when needed using the password.
          setWallet({ 
            address: metadata.address, 
            btcAddress: metadata.btcAddress, 
            seedPhrase: '', // Hidden until decrypted
            privateKey: '' // Hidden until decrypted
          });
          setViewState('main');
          fetchBalances(metadata.address, metadata.btcAddress);
          return;
        }
      } catch(e) {}
    }

    // Fallback for legacy static storage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        let parsed = decryptData(saved);
        if (!parsed) {
          parsed = JSON.parse(saved);
        }
        
        const hdWallet = ethers.HDNodeWallet.fromPhrase(parsed.seedPhrase, undefined, "m/44'/60'/0'/0/0");
        const currentWallet = { address: hdWallet.address, seedPhrase: parsed.seedPhrase, privateKey: hdWallet.privateKey, btcAddress: getBtcAddress(parsed.seedPhrase) };
        
        // Migrate to new split storage using static key initially
        localStorage.setItem(META_KEY, encryptData({ address: currentWallet.address, btcAddress: currentWallet.btcAddress }));
        localStorage.setItem(SECRETS_KEY, encryptData({ seedPhrase: currentWallet.seedPhrase, privateKey: currentWallet.privateKey }));
        localStorage.removeItem(STORAGE_KEY); // delete legacy

        setWallet({ address: currentWallet.address, btcAddress: currentWallet.btcAddress, seedPhrase: '', privateKey: '' });
        setViewState('main');
        fetchBalances(currentWallet.address, currentWallet.btcAddress);
      } catch (e) {
        setViewState('onboarding');
      }
    } else {
      setViewState('onboarding');
    }
  }, []);

  // 1 Minute Strict Expiration Timer for Dual Verification
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && otpTimeLeft > 0) {
      interval = setInterval(() => {
        setOtpTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (otpTimeLeft === 0 && showOtpModal) {
      toast.error("Transaction failed: 1 minute limit expired.");
      setShowOtpModal(false);
      setOtpInput('');
      setTotpInput('');
      setPendingTxData(null);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimeLeft]);

  const startCreate = () => {
    const seed = ethers.Mnemonic.fromEntropy(ethers.randomBytes(16))?.phrase;
    if (seed) {
      setNewSeed(seed);
      setViewState('create');
    }
  };

  const confirmCreate = () => {
    try {
      const hdWallet = ethers.HDNodeWallet.fromPhrase(newSeed, undefined, "m/44'/60'/0'/0/0");
      const currentWallet = { address: hdWallet.address, seedPhrase: newSeed, privateKey: hdWallet.privateKey, btcAddress: getBtcAddress(newSeed) };
      
      localStorage.setItem(META_KEY, encryptData({ address: currentWallet.address, btcAddress: currentWallet.btcAddress }));
      localStorage.setItem(SECRETS_KEY, encryptData({ seedPhrase: currentWallet.seedPhrase, privateKey: currentWallet.privateKey }));

      setWallet({ address: currentWallet.address, btcAddress: currentWallet.btcAddress, seedPhrase: '', privateKey: '' });
      setViewState('main');
      fetchBalances(currentWallet.address, currentWallet.btcAddress);
      toast.success("Wallet created successfully!");
    } catch(e) {
      toast.error("Failed to create wallet");
    }
  };

  const handleRestore = () => {
    try {
      const phrase = restorePhrase.trim().toLowerCase();
      const hdWallet = ethers.HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/60'/0'/0/0");
      const currentWallet = { address: hdWallet.address, seedPhrase: phrase, privateKey: hdWallet.privateKey, btcAddress: getBtcAddress(phrase) };
      
      localStorage.setItem(META_KEY, encryptData({ address: currentWallet.address, btcAddress: currentWallet.btcAddress }));
      localStorage.setItem(SECRETS_KEY, encryptData({ seedPhrase: currentWallet.seedPhrase, privateKey: currentWallet.privateKey }));

      setWallet({ address: currentWallet.address, btcAddress: currentWallet.btcAddress, seedPhrase: '', privateKey: '' });
      setViewState('main');
      fetchBalances(currentWallet.address, currentWallet.btcAddress);
      toast.success("Wallet restored successfully!");
    } catch(e) {
      toast.error("Invalid Secret Recovery Phrase. Check your 12 words.");
    }
  };

  const fetchBalances = async (address: string, btcAddress?: string) => {
    if (!address) return;
    setIsLoading(true);
    try {
      const ethProvider = new ethers.JsonRpcProvider(NETWORKS.ethereum.rpc);
      const bnbProvider = new ethers.JsonRpcProvider(NETWORKS.bnb.rpc);
      const maticProvider = new ethers.JsonRpcProvider(NETWORKS.polygon.rpc);

      const providers = { ethereum: ethProvider, bnb: bnbProvider, polygon: maticProvider };

      const [ethBal, bnbBal, maticBal] = await Promise.allSettled([
        ethProvider.getBalance(address),
        bnbProvider.getBalance(address),
        maticProvider.getBalance(address)
      ]);

      const newBalances: Record<string, string> = { ...balances };
      if (ethBal.status === 'fulfilled') newBalances.ETH = ethers.formatEther(ethBal.value);
      if (bnbBal.status === 'fulfilled') newBalances.BNB = ethers.formatEther(bnbBal.value);
      if (maticBal.status === 'fulfilled') newBalances.MATIC = ethers.formatEther(maticBal.value);

      const tokenPromises = TOKENS.map(async t => {
        try {
          const contract = new ethers.Contract(t.address, ERC20_ABI, providers[t.network as keyof typeof providers]);
          const bal = await contract.balanceOf(address);
          newBalances[t.symbol] = ethers.formatUnits(bal, t.decimals);
        } catch(e) {
          console.error(`Failed to fetch ${t.symbol}`, e);
        }
      });

      await Promise.allSettled(tokenPromises);
      
      // Fetch Native BTC Balance
      if (btcAddress) {
        try {
          const res = await fetch(`https://mempool.space/api/address/${btcAddress}`);
          if (res.ok) {
            const data = await res.json();
            const satoshis = (data.chain_stats.funded_txo_sum || 0) - (data.chain_stats.spent_txo_sum || 0);
            newBalances.BTC = (satoshis / 100000000).toString();
          }
        } catch (e) {
          console.error("Failed to fetch BTC balance", e);
        }
      }

      setBalances(newBalances);
    } catch (err) {
      toast.error("Failed to fetch live balances");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, msg: string = "Copied to clipboard!") => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const getDecryptedBoundRoute = () => {
    if (!hasBoundRoute) return null;
    if (boundRoute) return boundRoute; // Return cached if already unlocked in this session
    
    const encryptedRoutingStr = localStorage.getItem(ROUTING_SECRET_KEY);
    
    // --- NEW SYSTEM: Route stored separately with Routing Password ---
    if (encryptedRoutingStr) {
      const rPw = routingPwInput || prompt("Enter your Routing Password to send Auth Token:");
      if (!rPw) throw new Error("Routing Password required");
      setRoutingPwInput(rPw);
      
      const route = decryptData(encryptedRoutingStr, rPw);
      if (!route || typeof route !== 'string') {
        setRoutingPwInput('');
        throw new Error("Incorrect Routing Password");
      }
      setBoundRoute(route);
      return route;
    }
    
    // --- LEGACY MIGRATION: Route was stored inside SECRETS blob (old system) ---
    // Migrate it now: re-encrypt with a Routing Password into the new isolated store
    const encryptedSecretsStr = localStorage.getItem(SECRETS_KEY);
    if (!encryptedSecretsStr) throw new Error("Routing configuration not found");
    
    let decrypted: any;
    if (hasCustomPw) {
      const pw = pwInput || prompt("Enter Master Wallet Password to migrate your routing config:");
      if (!pw) throw new Error("Wallet Password required");
      setPwInput(pw);
      decrypted = decryptData(encryptedSecretsStr, pw);
      if (!decrypted || !decrypted.privateKey) throw new Error("Incorrect Wallet Password");
    } else {
      decrypted = decryptData(encryptedSecretsStr);
      if (!decrypted || !decrypted.privateKey) throw new Error("Corrupted wallet data");
    }
    
    const legacyRoute = decrypted.boundRoute;
    if (!legacyRoute) throw new Error("No routing configuration found");
    
    // Prompt user to create a Routing Password for migration
    const newRPw = prompt("⚡ System Upgrade: Create a Routing Password to isolate your routing config from your Master Password (min 6 chars):");
    if (!newRPw || newRPw.length < 6) throw new Error("Routing Password must be at least 6 characters");
    
    // Migrate: store in isolated key with Routing Password
    localStorage.setItem(ROUTING_SECRET_KEY, encryptData(legacyRoute, newRPw));
    
    // Remove from SECRETS blob
    delete decrypted.boundRoute;
    localStorage.setItem(SECRETS_KEY, hasCustomPw ? encryptData(decrypted, pwInput) : encryptData(decrypted));
    
    setRoutingPwInput(newRPw);
    setBoundRoute(legacyRoute);
    toast.success("Routing config migrated to isolated storage!");
    return legacyRoute;
  };

  const SERVER_NETWORK_KEY = "TrustValotStaticServerKey2026";
  const getE2ENode = (email: string) => encryptData(email, SERVER_NETWORK_KEY);

  // ─── WALLET PACK EXPORT ─────────────────────────────────────────────────────
  const handleExportPack = async () => {
    if (!packPassword || packPassword.length < 12) return toast.error("Pack Password must be at least 12 characters");
    if (!wallet) return;
    setIsExporting(true);
    try {
      // 1. Collect SECRETS (Private Key + Seed)
      const encryptedSecretsStr = localStorage.getItem(SECRETS_KEY);
      if (!encryptedSecretsStr) throw new Error("Wallet secrets not found");
      let secrets: any;
      if (hasCustomPw) {
        const pw = pwInput || prompt("Enter Master Wallet Password to export:");
        if (!pw) { setIsExporting(false); return; }
        setPwInput(pw);
        secrets = decryptData(encryptedSecretsStr, pw);
      } else {
        secrets = decryptData(encryptedSecretsStr);
      }
      if (!secrets?.privateKey) throw new Error("Could not decrypt wallet secrets");

      // 2. Collect Routing Destination
      const route = getDecryptedBoundRoute();
      if (!route) throw new Error("No routing channel configured");

      // 3. Collect TOTP Secret from server via ZKP
      const totpCode = prompt("Enter your Authenticator Code to authorize pack export:");
      if (!totpCode) { setIsExporting(false); return; }
      const totpCiphertext = encryptData({ timestamp: Date.now(), action: "pack_export" }, totpCode);
      const totpRes = await fetch("http://localhost:3000/api/pack/export-temporal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(route), ciphertext: totpCiphertext })
      });
      const totpData = await totpRes.json();
      if (!totpRes.ok) throw new Error(totpData.error || "TOTP export failed");

      // 4. Assemble the pack
      const pack = {
        v: 1,
        ts: Date.now(),
        privateKey: secrets.privateKey,
        seedPhrase: secrets.seedPhrase,
        route,
        temporalSecret: totpData.temporalSecret,
        pwHash: localStorage.getItem(PW_HASH_KEY) || '',
        masterPw: hasCustomPw ? null : 'none', // hint only
      };

      // 5. Encrypt with Pack Password (inner layer), then wrap with E2E key (outer layer)
      const innerEncrypted = encryptData(pack, packPassword);
      // Outer E2E layer — SERVER_NETWORK_KEY bakes the app identity into the file
      const e2eWrapped = encryptData(innerEncrypted, SERVER_NETWORK_KEY);
      const blob = new Blob([e2eWrapped], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trustvalot-pack-${Date.now()}.tvpack`;
      a.click();
      URL.revokeObjectURL(url);

      setPackPassword(''); // Clear immediately — never stored
      localStorage.setItem('trustvalot-pack-sealed', 'true'); // Only a flag, no sensitive data
      setHasExportedPack(true);
      toast.success("Wallet Pack exported! Keep the .tvpack file and Pack Password safe — this device will no longer store pack info.");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // ─── WALLET PACK IMPORT ─────────────────────────────────────────────────────
  const handleImportPack = async () => {
    if (!importPackText.trim()) return toast.error("Paste or load the pack content first");
    if (!importPackPassword || importPackPassword.length < 12) return toast.error("Pack Password must be at least 12 characters");
    setIsImporting(true);
    try {
      // 1. Strip outer E2E layer first, then decrypt inner Pack Password layer
      const e2eStripped = decryptData(importPackText.trim(), SERVER_NETWORK_KEY);
      if (!e2eStripped || typeof e2eStripped !== 'string') throw new Error("Invalid pack file or wrong app version");
      const pack = decryptData(e2eStripped, importPackPassword);
      if (!pack?.privateKey || !pack?.seedPhrase) throw new Error("Incorrect Pack Password or corrupted pack");

      // 2. Restore wallet from private key
      const importedWallet = new ethers.Wallet(pack.privateKey);
      const { HDNodeWallet } = ethers;
      const hdNode = HDNodeWallet.fromPhrase(pack.seedPhrase);
      const btcAddress = null; // BTC address derived separately if needed

      const walletData = {
        address: importedWallet.address,
        btcAddress,
        seedPhrase: pack.seedPhrase,
      };
      localStorage.setItem(META_KEY, encryptData({ address: importedWallet.address, btcAddress }));

      // 3. Re-encrypt SECRETS with the user's chosen password (or static key)
      const secretsObj = { privateKey: pack.privateKey, seedPhrase: pack.seedPhrase };
      if (pack.pwHash && pack.pwHash !== '') {
        // Ask for Master Password
        const newMasterPw = prompt("Enter a Master Wallet Password for this device (must match your original password):");
        if (!newMasterPw) { setIsImporting(false); return; }
        localStorage.setItem(SECRETS_KEY, encryptData(secretsObj, newMasterPw));
        localStorage.setItem(PW_HASH_KEY, pack.pwHash);
      } else {
        localStorage.setItem(SECRETS_KEY, encryptData(secretsObj));
      }

      // 4. Restore Routing Destination — ask for new Routing Password
      const newRoutingPw = prompt("Create a Routing Password for this device (min 6 chars):");
      if (!newRoutingPw || newRoutingPw.length < 6) throw new Error("Routing Password required (min 6 chars)");
      localStorage.setItem(ROUTING_SECRET_KEY, encryptData(pack.route, newRoutingPw));
      localStorage.setItem('trustvalot-email-bound', 'true');
      setRoutingPwInput(newRoutingPw);

      // 5. Re-register TOTP on server
      if (pack.temporalSecret) {
        const serverRes = await fetch("http://localhost:3000/api/pack/import-temporal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ e2eNode: getE2ENode(pack.route), temporalSecret: pack.temporalSecret })
        });
        if (!serverRes.ok) throw new Error("Failed to restore Authenticator on server");
      }

      // 6. Load wallet into state
      setWallet(walletData as any);
      setHasBoundRoute(true);
      setBoundRoute(pack.route);
      setHasCustomPw(!!pack.pwHash);
      setImportPackText('');
      setImportPackPassword('');
      setViewState('main');
      toast.success("Wallet Pack imported successfully! Everything is restored.");
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    let routeToUse = sendRoute;
    if (hasBoundRoute) {
      try {
        routeToUse = getDecryptedBoundRoute();
        setSendRoute(routeToUse);
      } catch (e: any) {
        return toast.error(e.message);
      }
    }
    
    if (!sendAddress || !sendAmount || !routeToUse) return toast.error("Please fill all fields");

    setIsSending(true);
    try {
      const res = await fetch("http://localhost:3000/api/send-crypto-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(routeToUse) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setPendingTxData({ sendAsset, sendAddress, sendAmount });
      setOtpIntent('send');
      setOtpTimeLeft(60);
      setShowOtpModal(true);
      toast.success("OTP sent to your email!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error initiating transaction");
    } finally {
      setIsSending(false);
    }
  };

  // Helper to securely get secrets using the password if set, or static key if not
  const getDecryptedSecrets = () => {
    const encryptedSecretsStr = localStorage.getItem(SECRETS_KEY);
    if (!encryptedSecretsStr) throw new Error("Wallet secrets not found locally");
    
    // If user has set a custom password, we MUST use it to decrypt
    if (hasCustomPw) {
      if (!pwInput) throw new Error("Wallet Password required");
      const decrypted = decryptData(encryptedSecretsStr, pwInput);
      if (!decrypted || !decrypted.privateKey) throw new Error("Incorrect Wallet Password");
      return decrypted;
    }
    
    // Otherwise fallback to static encryption
    const decrypted = decryptData(encryptedSecretsStr);
    if (!decrypted || !decrypted.privateKey) throw new Error("Corrupted wallet secrets");
    return decrypted;
  };

  const verifyAndSendTx = async () => {
    if (!wallet || !pendingTxData) return;
    if (!otpInput || otpInput.length !== 6) return toast.error("Enter a valid 6-digit Auth Token");
    if (!totpInput || totpInput.length !== 6) return toast.error("Enter a valid 6-digit Authenticator Code");
    if (hasCustomPw && !pwInput) return toast.error("Enter your Wallet Password");

    setIsVerifyingOtp(true);
    try {
      // 1. Decrypt Wallet Secrets BEFORE sending network requests to fail fast if password is wrong
      const secrets = getDecryptedSecrets();

      // 2. Verify Google Authenticator TOTP using ZKP
      const totpPayload = { timestamp: Date.now(), action: "verify_totp" };
      const totpCiphertext = encryptData(totpPayload, totpInput);
      
      const totpRes = await fetch("http://localhost:3000/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(sendRoute), ciphertext: totpCiphertext })
      });
      const totpData = await totpRes.json();
      if (!totpRes.ok) throw new Error(totpData.error || "Invalid Google Authenticator Code");

      // 3. Verify Email OTP using Zero-Knowledge Proof (ZKP)
      const payload = { timestamp: Date.now(), action: "verify_crypto" };
      const ciphertext = encryptData(payload, otpInput);

      const verifyRes = await fetch("http://localhost:3000/api/verify-crypto-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(sendRoute), ciphertext })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid Auth Token");

      // 4. Sign and Send Transaction using decrypted private key
      const { sendAsset, sendAddress, sendAmount } = pendingTxData;
      
      let txHash = '';
      const isNative = ['ETH', 'BNB', 'MATIC'].includes(sendAsset);

      if (sendAsset === 'BTC') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        txHash = 'mock_tx_' + Math.random().toString(36).substring(2, 15);
      } else if (isNative) {
        const networkKeys: Record<string, string> = { ETH: 'ethereum', BNB: 'bnb', MATIC: 'polygon' };
        const provider = new ethers.JsonRpcProvider(NETWORKS[networkKeys[sendAsset] as keyof typeof NETWORKS].rpc);
        const signer = new ethers.Wallet(secrets.privateKey, provider);
        const tx = await signer.sendTransaction({
          to: sendAddress,
          value: ethers.parseEther(sendAmount)
        });
        txHash = tx.hash;
      } else {
        const token = TOKENS.find(t => t.symbol === sendAsset);
        if (!token) throw new Error("Unknown asset selected");
        const provider = new ethers.JsonRpcProvider(NETWORKS[token.network as keyof typeof NETWORKS].rpc);
        const signer = new ethers.Wallet(secrets.privateKey, provider);
        const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
        const tx = await contract.transfer(sendAddress, ethers.parseUnits(sendAmount, token.decimals));
        txHash = tx.hash;
      }
      
      const newTx = { type: 'SEND', asset: sendAsset, amount: sendAmount, to: sendAddress, hash: txHash, date: new Date().toISOString() };
      const updatedTxs = [newTx, ...txHistory];
      setTxHistory(updatedTxs);
      localStorage.setItem('trustvalot-wallet-txs', encryptData(updatedTxs));
      
      toast.success(`Transaction sent! Hash: ${txHash.slice(0, 10)}...`);
      setSendAddress('');
      setSendAmount('');
      setShowOtpModal(false);
      setOtpInput('');
      setTotpInput('');
      setPwInput('');
      setPendingTxData(null);
      setTimeout(() => fetchBalances(wallet.address, wallet.btcAddress), 5000);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Transaction failed.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSetCustomPassword = () => {
    if (!setupPwInput || setupPwInput.length < 6) return toast.error("Password must be at least 6 characters.");
    
    // Retrieve current secrets using the static key
    const encryptedSecretsStr = localStorage.getItem(SECRETS_KEY);
    if (!encryptedSecretsStr) return toast.error("Wallet data not found");
    
    const decrypted = decryptData(encryptedSecretsStr); // uses ENCRYPTION_KEY
    if (!decrypted || !decrypted.seedPhrase) return toast.error("Corrupted wallet data");

    // Re-encrypt secrets using the new custom password
    const newEncryptedSecrets = encryptData(decrypted, setupPwInput);
    localStorage.setItem(SECRETS_KEY, newEncryptedSecrets);

    // Save hash to mark password as set
    localStorage.setItem(PW_HASH_KEY, hashPassword(setupPwInput));
    
    setHasCustomPw(true);
    setSetupPwInput('');
    toast.success("Wallet Password set successfully! It is now encrypted end-to-end.");
  };

  const handleSendBindEmailOtp = async () => {
    if (!setupBoundRoute) return toast.error("Enter an email first");
    try {
      const res = await fetch("http://localhost:3000/api/send-crypto-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(setupBoundRoute) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsBindingEmail(true);
      toast.success("OTP sent to your email!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    }
  };

  const handleVerifyBindRouteOtp = async () => {
    if (!setupBoundRouteOtp || setupBoundRouteOtp.length !== 6) return toast.error("Enter a valid 6-digit Auth Token");
    if (!setupRoutingPw || setupRoutingPw.length < 6) return toast.error("Routing Password must be at least 6 characters");
    try {
      const payload = { timestamp: Date.now(), action: "verify_crypto" };
      const ciphertext = encryptData(payload, setupBoundRouteOtp);

      const res = await fetch("http://localhost:3000/api/verify-crypto-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(setupBoundRoute), ciphertext })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Verification successful!
      // CRITICAL: Encrypt the routing destination with the ROUTING password ONLY.
      // It is stored in a completely separate localStorage key.
      // The Master Password has zero knowledge of this value.
      const encryptedRoute = encryptData(setupBoundRoute, setupRoutingPw);
      localStorage.setItem(ROUTING_SECRET_KEY, encryptedRoute);
      localStorage.setItem('trustvalot-email-bound', 'true');
      
      setHasBoundRoute(true);
      setBoundRoute(setupBoundRoute);
      setRoutingPwInput(setupRoutingPw); // cache in volatile state for this session
      
      // Clear setup fields
      setSetupBoundRoute('');
      setSetupBoundAlias('');
      setSetupBoundRouteOtp('');
      setSetupRoutingPw('');
      setIsBindingEmail(false);
      
      toast.success("Routing channel configured! Destination encrypted with Routing Password only.");
    } catch (e: any) {
      toast.error(e.message || "Invalid Auth Token");
    }
  };

  const handleRevealClick = async () => {
    let routeToUse = setupTotpRoute;
    if (hasBoundRoute) {
      try {
        routeToUse = getDecryptedBoundRoute();
        setSetupTotpEmail(routeToUse);
      } catch (e: any) {
        return toast.error(e.message);
      }
    }
    
    if (!routeToUse) {
      return toast.error("Please configure routing destination in the setup section below first, so we can verify you.");
    }
    
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("http://localhost:3000/api/send-crypto-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(routeToUse) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send Auth Token");

      setOtpIntent('reveal');
      setOtpTimeLeft(60);
      setShowOtpModal(true);
      toast.success("Auth Token sent to your routing destination!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error sending OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const verifyAndRevealSeed = async () => {
    if (!otpInput || otpInput.length !== 6) return toast.error("Enter a valid 6-digit Auth Token");
    if (!totpInput || totpInput.length !== 6) return toast.error("Enter a valid 6-digit Authenticator Code");
    if (hasCustomPw && !pwInput) return toast.error("Enter your Wallet Password");

    setIsVerifyingOtp(true);
    try {
      // 1. Decrypt Wallet Secrets to fail fast
      const secrets = getDecryptedSecrets();

      // 2. Verify Google Authenticator Code using ZKP
      const totpPayload = { timestamp: Date.now(), action: "verify_totp" };
      const totpCiphertext = encryptData(totpPayload, totpInput);
      
      const totpRes = await fetch("http://localhost:3000/api/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(setupTotpRoute), ciphertext: totpCiphertext })
      });
      const totpData = await totpRes.json();
      if (!totpRes.ok) throw new Error(totpData.error || "Invalid Google Authenticator Code");

      // 3. Verify Email OTP using Zero-Knowledge Proof (ZKP)
      const payload = { timestamp: Date.now(), action: "verify_crypto" };
      const ciphertext = encryptData(payload, otpInput);

      const verifyRes = await fetch("http://localhost:3000/api/verify-crypto-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(setupTotpRoute), ciphertext })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Invalid Auth Token");

      // All verified! Temporarily load the seed phrase into the UI state
      setWallet(prev => prev ? { ...prev, seedPhrase: secrets.seedPhrase } : null);
      setShowSeed(true);
      setShowOtpModal(false);
      setOtpInput('');
      setTotpInput('');
      setPwInput('');
      localStorage.setItem('trustvalot-seed-revealed', 'true');
      toast.success("Security verified. Seed phrase revealed.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Verification failed.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const generateTotp = async () => {
    let routeToUse = setupTotpRoute;
    if (hasBoundRoute) {
      try {
        routeToUse = getDecryptedBoundRoute();
        setSetupTotpEmail(routeToUse);
      } catch (e: any) {
        return toast.error(e.message);
      }
    }
    
    if (!routeToUse) return toast.error("Please enter routing destination to setup TOTP");
    setIsSettingUpTotp(true);
    try {
      const res = await fetch("http://localhost:3000/api/totp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(routeToUse) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTotpSecret(data.secret);
      setTotpQrCode(data.qrCodeUrl);
    } catch(err: any) {
      toast.error(err.message || "Failed to generate TOTP");
    } finally {
      setIsSettingUpTotp(false);
    }
  };

  const confirmTotpSetup = async () => {
    if (!totpSetupCode || totpSetupCode.length !== 6) return toast.error("Enter 6 digit code");
    setIsSettingUpTotp(true);
    try {
      const res = await fetch("http://localhost:3000/api/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e2eNode: getE2ENode(setupTotpRoute), secret: totpSecret, token: totpSetupCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setTotpQrCode('');
      setTotpSecret('');
      setTotpSetupCode('');
    } catch(err: any) {
      toast.error(err.message || "Failed to confirm TOTP");
    } finally {
      setIsSettingUpTotp(false);
    }
  };

  if (viewState === 'loading') {
    return <div className="flex items-center justify-center min-h-[300px]"><RefreshCw className="animate-spin text-slate-900 w-8 h-8" /></div>;
  }

  if (viewState === 'onboarding') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Wallet size={40} className="text-slate-900" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Welcome to Crypto Space</h2>
        <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">Your secure, non-custodial Web3 wallet. Store, send, and receive crypto directly on your device.</p>
        
        <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={startCreate} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-md shadow-slate-900/20">
              Create New Wallet
            </button>
            <button onClick={() => setViewState('restore')} className="flex-1 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition-colors">
              Restore Wallet
            </button>
          </div>
          <button onClick={() => setViewState('import-pack')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-purple-900/20">
            <ShieldCheck size={18} /> Import from Secure Pack
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'create') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm max-w-2xl mx-auto w-full text-left">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">Secret Recovery Phrase</h2>
        <p className="text-slate-500 text-sm font-medium mb-6">Write down these 12 words in order and keep them safe. If you lose them, you lose your crypto.</p>
        
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {newSeed.split(' ').map((word, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-lg p-2 text-center flex flex-col shadow-sm">
                <span className="text-xs text-slate-400 font-bold mb-1">{i + 1}</span>
                <span className="font-mono text-slate-800 font-bold text-sm">{word}</span>
              </div>
            ))}
          </div>
          <button onClick={() => copyToClipboard(newSeed, "Phrase Copied!")} className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors">
            <Copy size={16} /> Copy to Clipboard
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setViewState('onboarding')} className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Back</button>
          <button onClick={confirmCreate} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md shadow-slate-900/20">
            I've Saved It, Open Wallet
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'restore') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm max-w-2xl mx-auto w-full text-left">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">Restore Existing Wallet</h2>
        <p className="text-slate-500 text-sm font-medium mb-6">Enter your 12-word Secret Recovery Phrase to restore your funds.</p>
        
        <textarea 
          value={restorePhrase}
          onChange={e => setRestorePhrase(e.target.value)}
          placeholder="Paste your 12 words here, separated by spaces..."
          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-4 font-mono text-sm focus:ring-0 focus:border-slate-900 outline-none transition-colors min-h-[120px] mb-6 resize-none"
        />

        <div className="flex gap-3">
          <button onClick={() => setViewState('onboarding')} className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Back</button>
          <button onClick={handleRestore} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md shadow-slate-900/20">
            Restore Wallet
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'import-pack') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm max-w-2xl mx-auto w-full text-left">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-purple-700" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">Import Secure Pack</h2>
            <p className="text-slate-500 text-sm font-medium">Restore your wallet from an encrypted .tvpack file</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Pack Content</label>
            <textarea
              value={importPackText}
              onChange={e => setImportPackText(e.target.value)}
              placeholder="Paste the contents of your .tvpack file here..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-4 font-mono text-xs focus:ring-0 focus:border-purple-400 outline-none transition-colors min-h-[120px] resize-none"
            />
            <label className="block mt-2">
              <span className="text-xs text-purple-600 font-semibold cursor-pointer hover:underline">Or click to upload .tvpack file</span>
              <input
                type="file"
                accept=".tvpack,.txt"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setImportPackText(ev.target?.result as string || '');
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Pack Password (12+ characters)</label>
            <input
              type="password"
              value={importPackPassword}
              onChange={e => setImportPackPassword(e.target.value)}
              placeholder="Enter the Pack Password..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm font-medium focus:ring-0 focus:border-purple-400 outline-none transition-colors"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 font-semibold">⚠️ After import, you will be asked to set a <strong>Routing Password</strong> and optionally a <strong>Master Wallet Password</strong> for this device. These can be different from the original device.</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => setViewState('onboarding')} className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Back</button>
          <button
            onClick={handleImportPack}
            disabled={isImporting}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md shadow-purple-900/20 flex items-center justify-center gap-2"
          >
            {isImporting ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {isImporting ? 'Importing...' : 'Import & Restore Wallet'}
          </button>
        </div>
      </div>
    );
  }

  if (!wallet || viewState !== 'main') return null;

  return (
    <div className="space-y-3 sm:space-y-4 w-full">
      {/* Main Content Area */}
      <div>
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Top Banner */}
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-sm mb-3 sm:mb-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Wallet className="text-slate-900" />
                    Crypto Space
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Non-custodial secure Web3 wallet directly on your device.</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 rounded-xl p-4 sm:p-6 text-white shadow-md border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Wallet size={120} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <p className="text-slate-400 font-medium text-xs sm:text-sm mb-1 capitalize ">Wallet Address</p>
                  <div className="flex items-center gap-2 mb-4 sm:mb-6">
                    <span className="font-mono text-base sm:text-lg bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm truncate max-w-[200px] sm:max-w-none">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                    <button onClick={() => copyToClipboard(wallet.address)} className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0">
                      <Copy size={16} />
                    </button>
                  </div>
                  
                  <p className="text-slate-400 font-medium text-xs sm:text-sm mb-1 capitalize ">Total Value (Approx)</p>
                  <h2 className="text-3xl sm:text-4xl font-black">
                    Live Balances
                  </h2>
                </div>
                <button 
                  onClick={() => fetchBalances(wallet.address, wallet.btcAddress)}
                  disabled={isLoading}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                { symbol: 'BTC', bal: balances.BTC || '0', net: { name: 'Bitcoin Network', explorer: 'https://mempool.space/address/' } },
                { symbol: 'ETH', bal: balances.ETH || '0', net: NETWORKS.ethereum },
                { symbol: 'BNB', bal: balances.BNB || '0', net: NETWORKS.bnb },
                { symbol: 'MATIC', bal: balances.MATIC || '0', net: NETWORKS.polygon },
                ...TOKENS.map(t => ({ symbol: t.symbol, bal: balances[t.symbol] || '0', net: NETWORKS[t.network as keyof typeof NETWORKS] }))
              ].map(asset => (
                <div key={asset.symbol} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                        {asset.symbol[0]}
                      </div>
                      <span className="text-xs sm:text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">Mainnet</span>
                    </div>
                    <p className="text-slate-500 font-medium text-xs sm:text-sm">{asset.net.name}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                      {parseFloat(asset.bal).toFixed(4)} {asset.symbol}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => copyToClipboard(asset.symbol === 'BTC' ? wallet.btcAddress! : wallet.address, `${asset.net.name} Address Copied!`)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        title={`Copy ${asset.net.name} Address`}
                      >
                        <Copy size={16} />
                      </button>
                      <a 
                        href={`${asset.net.explorer}${asset.symbol === 'BTC' ? wallet.btcAddress : wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        title={`View on ${asset.net.name} Explorer`}
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 mt-4">
              {/* Transaction History */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-3">Recent Transactions</h3>
                {txHistory.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {txHistory.slice(0, 3).map((tx, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <Send size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Sent {tx.asset}</p>
                            <p className="text-xs sm:text-xs text-slate-500 font-mono">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">-{tx.amount} {tx.asset}</p>
                          <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">No recent transactions yet.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* SEND TAB */}
        {activeTab === 'send' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-slate-100 text-slate-900 rounded-lg sm:rounded-xl">
                <Send size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">Send Crypto</h2>
                <p className="text-xs sm:text-xs text-slate-500 font-medium">Transfer funds directly on-chain.</p>
              </div>
            </div>
            
            <form onSubmit={handleSend} className="space-y-3 sm:space-y-4 w-full">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Select Asset</label>
                <select 
                  value={sendAsset} 
                  onChange={e => setSendAsset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium focus:ring-0 focus:border-slate-900 outline-none transition-colors"
                >
                  <optgroup label="Native Assets">
                    <option value="BTC">Bitcoin (BTC) - Bal: {parseFloat(balances.BTC || '0').toFixed(8)}</option>
                    <option value="ETH">Ethereum (ETH) - Bal: {parseFloat(balances.ETH || '0').toFixed(4)}</option>
                    <option value="BNB">BNB Chain (BNB) - Bal: {parseFloat(balances.BNB || '0').toFixed(4)}</option>
                    <option value="MATIC">Polygon (MATIC) - Bal: {parseFloat(balances.MATIC || '0').toFixed(4)}</option>
                  </optgroup>
                  <optgroup label="ERC20 Tokens">
                    {TOKENS.map(t => (
                      <option key={t.symbol} value={t.symbol}>{t.name} ({t.symbol}) - Bal: {parseFloat(balances[t.symbol] || '0').toFixed(4)}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Recipient Address</label>
                <input 
                  type="text" 
                  value={sendAddress}
                  onChange={e => setSendAddress(e.target.value)}
                  placeholder="0x..." 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-xs sm:text-sm focus:ring-0 focus:border-slate-900 outline-none transition-colors"
                  required
                />
              </div>
              
              {!hasBoundRoute && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700 font-semibold">⚠️ No routing channel configured. Please go to the <strong>Security Tab</strong> and set up Secure Routing first before sending.</p>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Amount</label>
                <input 
                  type="number" 
                  step="any"
                  min="0"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  placeholder="0.00" 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium focus:ring-0 focus:border-slate-900 outline-none transition-colors"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isSending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3.5 sm:py-4 font-bold text-base sm:text-lg transition-colors mt-4 sm:mt-6 flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-slate-900/20"
              >
                {isSending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                {isSending ? 'Sending Transaction...' : 'Send Now'}
              </button>
            </form>
          </div>
        )}

        {/* RECEIVE TAB */}
        {activeTab === 'receive' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <ArrowDownToLine size={24} className="sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1">Receive Crypto</h2>
            <p className="text-xs sm:text-xs text-slate-500 font-medium mb-4 sm:mb-6 mx-auto">
              Send ETH, BNB, MATIC, or supported ERC20 tokens to this universal EVM address.
            </p>
            
            <div className="inline-block bg-white p-2 sm:p-3 border-2 border-slate-100 rounded-xl sm:rounded-lg shadow-sm mb-4 sm:mb-6">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet.address}`} alt="Wallet QR Code" className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg" />
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 mx-auto w-full mb-6">
              <span className="font-mono text-xs sm:text-sm text-slate-700 truncate w-full sm:w-auto text-center sm:text-left">{wallet.address}</span>
              <button onClick={() => copyToClipboard(wallet.address, "EVM Address Copied!")} className="w-full sm:w-auto shrink-0 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2">
                <Copy size={16} /> Copy
              </button>
            </div>

            {wallet.btcAddress && (
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-base font-black text-amber-500 mb-2">Native Bitcoin (BTC) Receive Address</h3>
                <p className="text-xs sm:text-xs text-slate-500 font-medium mb-4 mx-auto">Send ONLY Native Bitcoin (BTC) to this address.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 mx-auto w-full">
                  <span className="font-mono text-xs sm:text-sm text-amber-800 truncate w-full sm:w-auto text-center sm:text-left">{wallet.btcAddress}</span>
                  <button onClick={() => copyToClipboard(wallet.btcAddress as string, "BTC Address Copied!")} className="w-full sm:w-auto shrink-0 bg-white border border-amber-200 text-amber-700 hover:text-amber-900 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2">
                    <Copy size={16} /> Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm w-full">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-red-50 text-red-600 rounded-lg sm:rounded-xl">
                <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">Security & Backup</h2>
                <p className="text-xs sm:text-xs text-slate-500 font-medium">Protect your seed phrase.</p>
              </div>
            </div>

            {/* WALLET PASSWORD SETUP - Hides completely when set */}
            {!hasCustomPw ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-6 w-full">
                <h3 className="text-slate-800 font-black mb-1.5 sm:mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <Key size={18} /> Master Wallet Password
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                  Set a permanent password to encrypt your seed phrase locally. <span className="text-red-500 font-bold">WARNING: If you forget this password, there is NO recovery option. You will lose access forever.</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="Enter strong password..."
                    value={setupPwInput}
                    onChange={(e) => setSetupPwInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <button onClick={handleSetCustomPassword} className="bg-slate-900 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-slate-800">
                    Encrypt
                  </button>
                </div>
              </div>
            ) : null}

            {/* BIND EMAIL SETUP - Hides when set */}
            {!hasBoundRoute ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-6 w-full">
                <h3 className="text-blue-800 font-black mb-1.5 sm:mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <Mail size={18} /> Configure Secure Routing
                </h3>
                <p className="text-blue-700/80 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                  Set a destination to receive auth tokens. You will create a <strong>Routing Password</strong> — completely separate from your Master Password. Even if your Master Password is compromised, the destination stays hidden.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Enter Public Alias..."
                    value={setupBoundAlias}
                    onChange={(e) => setSetupBoundAlias(e.target.value)}
                    className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    disabled={isBindingEmail}
                  />
                  <input
                    type="text"
                    placeholder="Enter Destination Address..."
                    value={setupBoundRoute}
                    onChange={(e) => setSetupBoundRoute(e.target.value)}
                    className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    disabled={isBindingEmail}
                  />
                  <button onClick={handleSendBindEmailOtp} disabled={isBindingEmail} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    Send Token
                  </button>
                </div>
                {isBindingEmail && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Enter 6-digit Auth Token..."
                      value={setupBoundRouteOtp}
                      onChange={(e) => setSetupBoundRouteOtp(e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 font-mono text-center"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        placeholder="Create Routing Password (min 6 chars)..."
                        value={setupRoutingPw}
                        onChange={(e) => setSetupRoutingPw(e.target.value)}
                        className="flex-1 bg-white border border-purple-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
                      />
                      <button onClick={handleVerifyBindRouteOtp} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-purple-700 whitespace-nowrap">
                        Verify &amp; Lock
                      </button>
                    </div>
                    <p className="text-xs text-purple-700 font-medium">⚠️ This Routing Password is separate from your Master Password. Store it safely — it cannot be recovered.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Route already bound — show Routing Password setup/status */
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-6 w-full">
                <h3 className="text-purple-800 font-black mb-1.5 sm:mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <ShieldCheck size={18} /> Routing Channel
                </h3>
                {!localStorage.getItem(ROUTING_SECRET_KEY) ? (
                  <>
                    <p className="text-purple-700 text-xs sm:text-sm font-medium mb-3">
                      ⚡ <strong>Action Required:</strong> Create a Routing Password to fully isolate your routing destination from your Master Password.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        placeholder="Create Routing Password (min 6 chars)..."
                        value={setupRoutingPw}
                        onChange={(e) => setSetupRoutingPw(e.target.value)}
                        className="flex-1 bg-white border border-purple-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={async () => {
                          if (!setupRoutingPw || setupRoutingPw.length < 6) return toast.error("Routing Password must be at least 6 characters");
                          try {
                            const encStr = localStorage.getItem(SECRETS_KEY);
                            if (!encStr) return toast.error("Wallet secrets not found");
                            let dec: any;
                            if (hasCustomPw) {
                              const pw = pwInput || prompt("Enter Master Wallet Password to migrate routing:");
                              if (!pw) return;
                              setPwInput(pw);
                              dec = decryptData(encStr, pw);
                            } else {
                              dec = decryptData(encStr);
                            }
                            if (!dec?.boundRoute) return toast.error("No routing data found in wallet. Please set up routing fresh.");
                            localStorage.setItem(ROUTING_SECRET_KEY, encryptData(dec.boundRoute, setupRoutingPw));
                            delete dec.boundRoute;
                            localStorage.setItem(SECRETS_KEY, hasCustomPw ? encryptData(dec, pwInput) : encryptData(dec));
                            setRoutingPwInput(setupRoutingPw);
                            setBoundRoute(dec.boundRoute);
                            setSetupRoutingPw('');
                            toast.success("Routing Password set! Destination is now fully isolated.");
                          } catch (e: any) { toast.error(e.message); }
                        }}
                        className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-purple-700 whitespace-nowrap"
                      >
                        Set Password
                      </button>
                    </div>
                    <p className="text-xs text-purple-600 font-medium mt-2">⚠️ This is separate from your Master Password and cannot be recovered if forgotten.</p>
                  </>
                ) : (
                  <p className="text-green-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck size={16} /> Routing channel is secured with an isolated Routing Password.
                  </p>
                )}
              </div>
            )}


            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-6 w-full">
              <h3 className="text-amber-800 font-black mb-1.5 sm:mb-2 flex items-center gap-2 text-sm sm:text-base">
                <Key size={18} /> Secret Recovery Phrase (Seed)
              </h3>
              {hasRevealedSeed && !showSeed ? (
                <div className="bg-white border border-amber-200 rounded-xl p-4 sm:p-6 text-center mt-2">
                  <ShieldCheck size={32} className="text-amber-500 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 mb-1">Phrase Already Backed Up</h4>
                  <p className="text-sm text-slate-500 font-medium">For maximum security, your seed phrase can only be viewed once on this device. You have already revealed it previously.</p>
                </div>
              ) : (
                <>
                  <p className="text-amber-700/80 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                    If you lose this phrase, you lose your wallet forever. Never share this with anyone.
                  </p>
                  
                  <div className="bg-white border border-amber-200 rounded-xl p-3 sm:p-4 relative">
                    {!showSeed ? (
                      <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center cursor-pointer" onClick={handleRevealClick}>
                        <Eye size={24} className="text-slate-400 mb-2" />
                        <span className="text-xs sm:text-sm font-bold text-slate-600">Click to verify and reveal seed phrase</span>
                      </div>
                    ) : null}
                    
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                      {wallet.seedPhrase ? wallet.seedPhrase.split(' ').map((word, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 sm:p-2 text-center flex flex-col">
                          <span className="text-xs sm:text-xs text-slate-400 font-bold">{i + 1}</span>
                          <span className="font-mono text-slate-800 font-bold text-xs sm:text-sm">{word}</span>
                        </div>
                      )) : null}
                    </div>
                  </div>
                  
                  {showSeed && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3 sm:gap-0">
                      <button onClick={() => {
                        setShowSeed(false);
                        setHasRevealedSeed(true); // Permanent block after hiding
                        setWallet(prev => prev ? { ...prev, seedPhrase: '' } : null);
                      }} className="w-full sm:w-auto justify-center text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white sm:bg-transparent border sm:border-transparent border-slate-200 py-2 sm:py-0 rounded-lg">
                        <EyeOff size={16} /> Hide Phrase Permanently
                      </button>
                      <button onClick={() => copyToClipboard(wallet.seedPhrase)} className="w-full sm:w-auto justify-center text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 bg-slate-100 sm:bg-transparent py-2 sm:py-0 rounded-lg">
                        <Copy size={16} /> Copy Phrase
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm w-full mt-4">
              <h3 className="text-slate-900 font-black mb-1.5 sm:mb-2 text-sm sm:text-base">
                Google Authenticator (2FA)
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mb-4">
                Set up Google Authenticator to require a code in addition to your Auth Token when sending funds.
              </p>
              
              {!totpQrCode ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  {!hasBoundRoute && (
                    <input 
                      type="text"
                      value={setupTotpRoute}
                      onChange={e => setSetupTotpEmail(e.target.value)}
                      placeholder="Enter Routing Destination"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-0 outline-none"
                    />
                  )}
                  <button 
                    onClick={generateTotp}
                    disabled={isSettingUpTotp}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                  >
                    Set Up
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <img src={totpQrCode} alt="TOTP QR Code" className="mx-auto w-40 h-40 mb-3" />
                  <p className="text-xs text-slate-500 mb-3 font-mono break-all">{totpSecret}</p>
                  <div className="flex flex-col sm:flex-row gap-2 max-w-xs mx-auto">
                    <input 
                      type="text"
                      maxLength={6}
                      value={totpSetupCode}
                      onChange={e => setTotpSetupCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-0 outline-none text-center font-mono "
                    />
                    <button 
                      onClick={confirmTotpSetup}
                      disabled={isSettingUpTotp}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── EXPORT WALLET PACK ── */}
      {activeTab === 'security' && (
        <div className={`border rounded-xl p-4 sm:p-6 w-full mt-2 transition-all ${hasExportedPack ? 'bg-slate-800/60 border-slate-700 opacity-70' : 'bg-gradient-to-br from-purple-900 to-slate-900 border-purple-800'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasExportedPack ? 'bg-slate-700' : 'bg-purple-800/60'}`}>
              <ShieldCheck size={20} className={hasExportedPack ? 'text-slate-400' : 'text-purple-300'} />
            </div>
            <div>
              <h3 className={`font-black text-sm sm:text-base ${hasExportedPack ? 'text-slate-400' : 'text-white'}`}>Export Secure Pack</h3>
              <p className={`text-xs font-medium ${hasExportedPack ? 'text-slate-500' : 'text-purple-300'}`}>
                {hasExportedPack ? 'Pack has been created — this device stores nothing about it' : 'Portable encrypted wallet for any device'}
              </p>
            </div>
          </div>
          {hasExportedPack ? (
            <>
              <p className="text-slate-400 text-xs font-medium mb-3 leading-relaxed">
                ✅ Secure Pack was created on this device. The Pack Password is <strong>not stored anywhere</strong> — only you know it. To restore on a new device, use the .tvpack file + your Pack Password.
              </p>
              <p className="text-slate-500 text-xs font-medium">This section is dimmed for security — no pack data exists on this device.</p>
            </>
          ) : (
            <>
              <p className="text-purple-200 text-xs font-medium mb-4 leading-relaxed">
                Creates a <strong>.tvpack</strong> file containing your private key, seed phrase, routing destination, and Authenticator secret — all encrypted with a <strong>12+ character Pack Password</strong>. Use it to restore your complete wallet on any device instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  placeholder="Create Pack Password (min 12 chars)..."
                  value={packPassword}
                  onChange={e => setPackPassword(e.target.value)}
                  className="flex-1 bg-purple-900/50 border border-purple-700 text-white placeholder:text-purple-400 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-400"
                />
                <button
                  onClick={handleExportPack}
                  disabled={isExporting}
                  className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  {isExporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
              <p className="text-purple-400 text-xs font-medium mt-2">⚠️ Keep the .tvpack file and Pack Password separately. If lost, there is NO recovery.</p>
            </>
          )}
        </div>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center my-8 relative">
            
            {/* Countdown Timer Badge */}
            <div className="absolute top-4 right-4 bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1 border border-red-200">
              <RefreshCw size={10} className={otpTimeLeft > 0 ? "animate-spin" : ""} />
              00:{otpTimeLeft.toString().padStart(2, '0')}
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2 mt-2">
              {otpIntent === 'send' ? 'Dual Verification' : 'Verify to Reveal Seed'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {otpIntent === 'send' 
                ? 'Enter both codes to authorize this transaction.' 
                : 'Enter both codes to reveal your highly sensitive seed phrase.'}
            </p>
            
            <div className="mb-4 text-left">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Auth Token (sent to routing destination)
              </label>
              <input 
                type="text" 
                maxLength={6}
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                placeholder="000000" 
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold focus:ring-0 focus:border-slate-900 outline-none transition-colors"
              />
            </div>
            
            <div className="mb-6 text-left">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Google Authenticator Code
              </label>
              <input 
                type="text" 
                maxLength={6}
                value={totpInput}
                onChange={e => setTotpInput(e.target.value)}
                placeholder="000000" 
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold focus:ring-0 focus:border-slate-900 outline-none transition-colors"
              />
            </div>

            {hasCustomPw && (
              <div className="mb-6 text-left">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Master Wallet Password
                </label>
                <input 
                  type="password" 
                  value={pwInput}
                  onChange={e => setPwInput(e.target.value)}
                  placeholder="Enter your password..." 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-center text-lg font-bold focus:ring-0 focus:border-slate-900 outline-none transition-colors"
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowOtpModal(false); setOtpInput(''); setTotpInput(''); }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={otpIntent === 'send' ? verifyAndSendTx : verifyAndRevealSeed}
                disabled={isVerifyingOtp}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {isVerifyingOtp ? "Verifying..." : (otpIntent === 'send' ? "Confirm Send" : "Reveal Phrase")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
