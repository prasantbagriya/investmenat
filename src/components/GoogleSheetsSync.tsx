import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, ShieldCheck, ArrowUpRight, ArrowDownLeft, RefreshCw, 
  ExternalLink, Settings, Plus, CheckCircle2, AlertTriangle, HelpCircle, Loader2
} from 'lucide-react';
import { getAccessToken, setAccessToken, db, signInWithGoogle } from '../firebase';
import { doc } from 'firebase/firestore';
import { setDoc } from '../firebase-sync';
import { Transaction, Holding, Sip, Fd, UserSettings } from '../types';

interface GoogleSheetsSyncProps {
  transactions: Transaction[];
  holdings: Holding[];
  sips: Sip[];
  fds: Fd[];
  userSettings: UserSettings | null;
  onUpdateUserSettings: (data: Partial<UserSettings>) => Promise<void>;
  onReloadData: () => void;
  onNavigateToTab?: (tab: string) => void;
  // Firestore setters to update local items if we pull and import
  onOverwriteTransactions?: (items: Omit<Transaction, 'id' | 'userId'>[]) => Promise<void>;
  onOverwriteHoldings?: (items: Omit<Holding, 'id' | 'userId'>[]) => Promise<void>;
  onOverwriteSips?: (items: Omit<Sip, 'id' | 'userId'>[]) => Promise<void>;
  onOverwriteFds?: (items: Omit<Fd, 'id' | 'userId'>[]) => Promise<void>;
}

export default function GoogleSheetsSync({
  transactions,
  holdings,
  sips,
  fds,
  userSettings,
  onUpdateUserSettings,
  onReloadData,
  onNavigateToTab,
  onOverwriteTransactions,
  onOverwriteHoldings,
  onOverwriteSips,
  onOverwriteFds
}: GoogleSheetsSyncProps) {
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [spreadsheetId, setSpreadsheetId] = useState(userSettings?.googleSpreadsheetId || '');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [autoPush, setAutoPush] = useState(() => localStorage.getItem('googleSheetsAutoPush') === 'true');

  const [isSheetsLinked, setIsSheetsLinked] = useState(() => {
    const stored = localStorage.getItem('google_sheets_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  useEffect(() => {
    const handleTokenChange = () => {
      const activeToken = getAccessToken();
      setToken(activeToken);
      const stored = localStorage.getItem('google_sheets_linked');
      if (stored === null) {
        setIsSheetsLinked(!!activeToken);
      } else {
        setIsSheetsLinked(stored === 'true' && !!activeToken);
      }
    };
    window.addEventListener('google-token-changed', handleTokenChange);
    return () => window.removeEventListener('google-token-changed', handleTokenChange);
  }, []);

  useEffect(() => {
    if (userSettings?.googleSpreadsheetId) {
      setSpreadsheetId(userSettings.googleSpreadsheetId);
    }
  }, [userSettings]);

  useEffect(() => {
    localStorage.setItem('googleSheetsAutoPush', String(autoPush));
  }, [autoPush]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setActiveLogs(prev => [`[${time}] ${message}`, ...prev].slice(0, 50));
  };

  const handleClearToken = () => {
    setAccessToken(null);
    setToken(null);
    addLog("🗑️ Access token cleared successfully.");
    window.dispatchEvent(new Event('google-token-changed'));
  };

  const saveSpreadsheetId = async (idToSave: string) => {
    try {
      await onUpdateUserSettings({
        googleSpreadsheetId: idToSave.trim()
      });
      addLog(`💾 Saved Spreadsheet ID into secure ledger settings.`);
    } catch (err: any) {
      addLog(`❌ Failed to save Settings: ${err.message}`);
    }
  };

  // 1-Click Bootstrap Google Sheet inside Drive
  const handleCreateNewSpreadsheet = async () => {
    const currentToken = token || getAccessToken();
    if (!currentToken) {
      alert('Please authorize Google Connection first.');
      return;
    }

    setIsCreatingSheet(true);
    addLog('🚀 Initiating Google Sheets creation API endpoint handshake...');
    try {
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          properties: {
            title: 'InvestMant Ledger & Financial Portfolio Tracker'
          },
          sheets: [
            { properties: { title: 'Transactions' } },
            { properties: { title: 'Holdings' } },
            { properties: { title: 'SIPs' } },
            { properties: { title: 'FDs' } }
          ]
        })
      });

      if (!response.ok) {
        const errDetail = await response.text();
        throw new Error(`Google HTTP ${response.status}: ${errDetail}`);
      }

      const resData = await response.json();
      const newId = resData.spreadsheetId;
      setSpreadsheetId(newId);
      addLog(`🎉 Brand new Spreadsheet created: "InvestMant Ledger"`);
      addLog(`🔗 ID: ${newId}`);

      await saveSpreadsheetId(newId);

      // Instantly write headers to configure it beautifully
      addLog('🎨 Initializing default layout column headers...');
      await pushAllToSheets(newId, currentToken);
      addLog('🚀 Default database structures and tables mapped perfectly!');
    } catch (err: any) {
      addLog(`❌ Failed creating spreadsheet: ${err.message}`);
      alert(`API Error configuring sheet: ${err.message}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Overwrite range on Google Sheet
  const writeSheetRange = async (id: string, sheetName: string, values: any[][], authToken: string) => {
    // Clear old rows first to prevent merging with junk rows
    addLog(`🧹 Clearing contents in target worksheet [${sheetName}]...`);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${sheetName}!A1:Z5000:clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    addLog(`📤 Writing ${values.length} rows to [${sheetName}] range...`);
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${sheetName}!A1?valueInputOption=USER_ENTERED`;
    const res = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        range: `${sheetName}!A1`,
        majorDimension: 'ROWS',
        values: values
      })
    });

    if (!res.ok) {
      throw new Error(`Worksheet write error [${sheetName}]: ${res.statusText}`);
    }
  };

  // Push local app state to Google Workspace
  const pushAllToSheets = async (targetId = spreadsheetId, activeToken = token) => {
    const currentToken = activeToken || getAccessToken();
    const sheetId = targetId || spreadsheetId;
    if (!currentToken) {
      alert('Please connect Google Account first.');
      return;
    }
    if (!sheetId) {
      alert('Please input a valid Google Spreadsheet ID first.');
      return;
    }

    setIsPushing(true);
    addLog(`🚀 Upload process started for Spreadsheet ID: ${sheetId.substring(0, 8)}...`);

    try {
      // 1. Transactions Sheet
      const transRows = [
        ['ID', 'Type (income / expense)', 'Category', 'Amount (₹)', 'Date (YYYY-MM-DD)', 'Notes'],
        ...transactions.map(t => [t.id, t.type, t.category, t.amount, t.date, t.notes || ''])
      ];
      await writeSheetRange(sheetId, 'Transactions', transRows, currentToken);

      // 2. Holdings Sheet
      const holdingRows = [
        ['ID', 'Asset Type (stock / mf)', 'Ticker / Symbol', 'Scheme Code', 'Fund Name', 'Buy Average Price (₹)', 'Quantity Purchased', 'Buy Purchase Date', 'Asset Class', 'Broker Account'],
        ...holdings.map(h => [
          h.id, h.type, h.symbol || '', h.schemeCode || '', h.name || '', h.buyPrice, h.quantity, h.buyDate, h.assetClass, h.broker || ''
        ])
      ];
      await writeSheetRange(sheetId, 'Holdings', holdingRows, currentToken);

      // 3. SIPs Sheet
      const sipRows = [
        ['ID', 'Investment Scheme Name', 'Monthly Amount (₹)', 'SIP Start Date', 'SIP Recurring Day (1-28)', 'Asset Class', 'Broker Platform'],
        ...sips.map(s => [
          s.id, s.name, s.amount, s.startDate, s.sipDate, s.assetClass, s.broker || ''
        ])
      ];
      await writeSheetRange(sheetId, 'SIPs', sipRows, currentToken);

      // 4. FDs Sheet
      const fdRows = [
        ['ID', 'Holding Bank Name', 'Principal Principal (₹)', 'Interest Rate (%)', 'Tenure Months', 'StartDate (YYYY-MM-DD)', 'Maturity (YYYY-MM-DD)', 'Locker Notes'],
        ...fds.map(f => [
          f.id, f.bankName, f.principal, f.interestRate, f.tenure, f.startDate, f.maturityDate, f.notes || ''
        ])
      ];
      await writeSheetRange(sheetId, 'FDs', fdRows, currentToken);

      addLog('🏆 Synchronized cloud payload successfully. Google Sheets is fully up-to-date!');
      alert('✅ All ledger modules uploaded and synchronized to Google Sheets!');
    } catch (err: any) {
      addLog(`❌ Synchronization upload failed: ${err.message}`);
      alert(`Fetch sync error: ${err.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  // Helper to read Google sheet cells
  const fetchRange = async (id: string, range: string, authToken: string): Promise<any[][] | null> => {
    addLog(`📥 Querying rows from sheet scope: ${range}...`);
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) {
      addLog(`⚠️ Range [${range}] could not be retrieved. Might need to recreate headers.`);
      return null;
    }
    const data = await res.json();
    return data.values || [];
  };

  // Pull Google sheet data into Firestore
  const handlePullFromSheets = async () => {
    const currentToken = token || getAccessToken();
    if (!currentToken) {
      alert('Please connect Google Account first.');
      return;
    }
    if (!spreadsheetId) {
      alert('Please fill set Google Spreadsheet ID.');
      return;
    }

    const confirmAction = window.confirm(
      '⚠️ ALERT: This will download rows from Google Sheets. If you have non-empty rows, they will overwrite your applet state completely according to what is on the sheet. Do you want to proceed?'
    );
    if (!confirmAction) return;

    setIsPulling(true);
    addLog('📥 Loading tables from Sheets workspace into memory...');

    try {
      // 1. Transactions Pull
      const transGrid = await fetchRange(spreadsheetId, 'Transactions!A2:F5000', currentToken);
      if (transGrid && transGrid.length > 0 && onOverwriteTransactions) {
        const modeledTrans: Omit<Transaction, 'id' | 'userId'>[] = transGrid
          .filter(row => row[1] && row[3]) // sanity check
          .map(row => ({
            type: (row[1] || 'expense') as 'income' | 'expense',
            category: row[2] || 'Others',
            amount: parseFloat(row[3]) || 0,
            date: row[4] || new Date().toISOString().substring(0, 10),
            notes: row[5] || ''
          }));
        await onOverwriteTransactions(modeledTrans);
        addLog(`✅ Downloaded ${modeledTrans.length} Transactions.`);
      }

      // 2. Holdings Pull
      const holdingsGrid = await fetchRange(spreadsheetId, 'Holdings!A2:J5000', currentToken);
      if (holdingsGrid && holdingsGrid.length > 0 && onOverwriteHoldings) {
        const modeledHoldings: Omit<Holding, 'id' | 'userId'>[] = holdingsGrid
          .filter(row => row[5] && row[6])
          .map(row => ({
            type: (row[1] || 'stock') as 'stock' | 'mf',
            symbol: row[2] || '',
            schemeCode: row[3] || '',
            name: row[4] || '',
            buyPrice: parseFloat(row[5]) || 0,
            quantity: parseFloat(row[6]) || 0,
            buyDate: row[7] || new Date().toISOString().substring(0, 10),
            assetClass: (row[8] || 'Equity') as 'Equity' | 'Debt' | 'Gold' | 'Cash',
            broker: row[9] || 'Zerodha'
          }));
        await onOverwriteHoldings(modeledHoldings);
        addLog(`✅ Downloaded ${modeledHoldings.length} Stock & MF assets.`);
      }

      // 3. SIPs Pull
      const sipsGrid = await fetchRange(spreadsheetId, 'SIPs!A2:G5000', currentToken);
      if (sipsGrid && sipsGrid.length > 0 && onOverwriteSips) {
        const modeledSips: Omit<Sip, 'id' | 'userId'>[] = sipsGrid
          .filter(row => row[1] && row[2])
          .map(row => ({
            name: row[1],
            amount: parseFloat(row[2]) || 0,
            startDate: row[3] || new Date().toISOString().substring(0, 10),
            sipDate: parseInt(row[4]) || 5,
            assetClass: (row[5] || 'Equity') as 'Equity' | 'Debt' | 'Gold' | 'Cash',
            broker: row[6] || 'Zerodha'
          }));
        await onOverwriteSips(modeledSips);
        addLog(`✅ Downloaded ${modeledSips.length} Systematic SIP plans.`);
      }

      // 4. FDs Pull
      const fdsGrid = await fetchRange(spreadsheetId, 'FDs!A2:H5000', currentToken);
      if (fdsGrid && fdsGrid.length > 0 && onOverwriteFds) {
        const modeledFds: Omit<Fd, 'id' | 'userId'>[] = fdsGrid
          .filter(row => row[1] && row[2])
          .map(row => ({
            bankName: row[1],
            principal: parseFloat(row[2]) || 0,
            interestRate: parseFloat(row[3]) || 0,
            tenure: parseInt(row[4]) || 12,
            startDate: row[5] || new Date().toISOString().substring(0, 10),
            maturityDate: row[6] || new Date().toISOString().substring(0, 10),
            notes: row[7] || ''
          }));
        await onOverwriteFds(modeledFds);
        addLog(`✅ Downloaded ${modeledFds.length} FD Lockers.`);
      }

      addLog('🥇 Sheets download completed! Local cloud database upgraded successfully.');
      alert('🏆 Synchronization pull completed! Your local app values have matching records from Google Sheets.');
      onReloadData();
    } catch (err: any) {
      addLog(`❌ Sync Pull Failed: ${err.message}`);
      alert(`Error synchronizing tables: ${err.message}`);
    } finally {
      setIsPulling(false);
    }
  };

  if (!isSheetsLinked) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs font-sans max-w-4xl mx-auto text-center space-y-2" id="google-sheets-panel">
        <div className="mx-auto p-2 bg-amber-50 text-amber-700 rounded-3xl border border-amber-100 w-16 h-16 flex items-center justify-center">
          <FileSpreadsheet size={30} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Google Sheets Integration Disconnected</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sync Disabled</p>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto text-xs text-slate-600 leading-relaxed font-sans">
          📝 Google Sheets backing up service is currently deactivated. Setup must be initiated exclusively from the central <b>Settings</b> page/tab. We have hidden configuration blocks. Please toggle settings to complete authentication blocks in 1-Click!
        </div>
        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab('settings')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-1.5 px-3 rounded-xl text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            ⚙️ Open Settings & Links
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-3 shadow-xs font-sans max-w-4xl mx-auto space-y-3" id="google-sheets-panel">
      {/* Visual Header */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1">
          <div className="p-1 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Google Sheets Integration</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Real-Two Way Cloud Sync</p>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-1 text-xs">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-250/50 p-1.5 px-1 rounded-lg font-black flex items-center gap-1.5 shrink-0" title="Managed under Settings tab">
            <ShieldCheck size={14} className="animate-pulse" /> Google Sync Active
          </span>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('settings')}
              className="text-[9.5px] text-slate-400 hover:text-slate-650 uppercase font-black tracking-widest cursor-pointer"
            >
              Configure Settings ⚙️
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        
        {/* Workspace details and Sheet ID management */}
        <div className="md:col-span-3 space-y-2">
          <div className="p-2 bg-slate-50 border border-slate-150 rounded-2xl space-y-1.5">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Settings size={13} className="text-slate-500" /> Sheets Configuration
            </h3>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spreadsheet ID</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="e.g. 1aBCdEfGhIjKlMnOpQrStUvWxYz..."
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-1 px-1 text-xs font-mono text-slate-800 font-medium tracking-tight"
                />
                <button
                  onClick={() => saveSpreadsheetId(spreadsheetId)}
                  className="bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 font-extrabold px-1 rounded-xl border border-slate-200 transition-colors cursor-pointer text-xs shrink-0"
                >
                  Save ID
                </button>
              </div>
              <p className="text-[9px] text-slate-400 leading-normal mt-1">
                Found in your Google Spreadsheet URL: <code>https://docs.google.com/spreadsheets/d/<b>SPREADSHEET_ID</b>/edit</code>
              </p>
            </div>

            {token && (
              <div className="pt-1 flex flex-wrap gap-1">
                <button
                  onClick={handleCreateNewSpreadsheet}
                  disabled={isCreatingSheet}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold p-1 px-1.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingSheet ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Creating Space...
                    </>
                  ) : (
                    <>
                      <Plus size={13} /> 🚀 Bootstrap New Sheets File
                    </>
                  )}
                </button>

                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white hover:bg-slate-50 text-slate-700 font-bold p-1 px-1.5 rounded-xl text-xs border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    View Sheets File <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sync Operations Card Panels */}
          {spreadsheetId && token ? (
            <div className="grid grid-cols-2 gap-2">
              
              {/* Push Action */}
              <div className="border border-slate-150 p-2 rounded-2xl flex flex-col justify-between space-y-1 bg-white">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                    <ArrowUpRight size={14} className="text-emerald-600" /> Export to Sheets
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-1">
                    Upload transactions, SIPs, holdings, FDs instantly. Overwrites the sheet.
                  </p>
                </div>
                <button
                  onClick={() => pushAllToSheets()}
                  disabled={isPushing}
                  className="w-full text-center py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/45 rounded-xl text-xs font-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isPushing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>Sync App → Sheet</>
                  )}
                </button>
              </div>

              {/* Pull Action */}
              <div className="border border-slate-150 p-2 rounded-2xl flex flex-col justify-between space-y-1 bg-white">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                    <ArrowDownLeft size={14} className="text-indigo-600" /> Import from Sheets
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-1">
                    Download ledger entries from Google Sheet rows back into your private dashboard.
                  </p>
                </div>
                <button
                  onClick={handlePullFromSheets}
                  disabled={isPulling}
                  className="w-full text-center py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/45 rounded-xl text-xs font-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isPulling ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Downloading...
                    </>
                  ) : (
                    <>Sync Sheet → App</>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-200/50 p-2 rounded-2xl flex gap-1 text-xs text-amber-900 leading-relaxed">
              <AlertTriangle className="text-amber-600 shrink-0 select-none mt-0.5" size={16} />
              <div>
                <span className="font-black text-slate-800">Prerequisites Required:</span> Standard Google API Sheets sync requires you to:
                <ol className="list-decimal pl-2.5 mt-1.5 space-y-1 text-slate-600 text-[11px]">
                  <li>Authorize Google Connection by clicking the button above.</li>
                  <li>Provide your Spreadsheet ID OR click "Bootstrap New Sheets" to generate one.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Console Sync Logs / Terminal */}
        <div className="md:col-span-2 flex flex-col justify-between border border-slate-200 rounded-2xl p-2 bg-slate-900 text-white min-h-[300px] shadow-sm">
          <div className="space-y-1">
            <div className="flex justify-between items-center pb-1 border-b border-slate-800">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <RefreshCw size={11} className="animate-spin" /> Live Transmit Logs
              </span>
              <button
                onClick={() => setActiveLogs([])}
                className="text-[9px] hover:text-slate-200 text-slate-500 font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto font-mono text-[9px] text-slate-350 space-y-1.5 scrollbar-thin">
              {activeLogs.length === 0 ? (
                <p className="text-slate-500 italic py-1 truncate">Database ready for secure transmission handshake...</p>
              ) : (
                activeLogs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed whitespace-pre-wrap select-text">{log}</p>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-1 text-[9px] text-slate-500 font-semibold uppercase font-sans flex items-center justify-between">
            <span>InvestMant Sync Logs</span>
            <span>v1.2.0 API Connected</span>
          </div>
        </div>

      </div>

    </div>
  );
}
