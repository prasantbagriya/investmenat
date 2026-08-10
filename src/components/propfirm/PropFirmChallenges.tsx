import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { PropFirmChallenge, PropFirmAccount } from '../../types';
import { Activity, Plus, Trash2, Edit2, X, CheckCircle, Lock } from 'lucide-react';
import { db } from '../../firebase';
import { doc, collection } from 'firebase/firestore';
import { setDoc, updateDoc, deleteDoc } from '../../firebase-sync';

interface Props {
  challenges: PropFirmChallenge[];
  user: any;
  setChallenges?: React.Dispatch<React.SetStateAction<PropFirmChallenge[]>>;
  accounts?: PropFirmAccount[];
  setAccounts?: React.Dispatch<React.SetStateAction<PropFirmAccount[]>>;
  firmNames?: string[];
}

export default function PropFirmChallenges({ challenges, user, setChallenges, accounts = [], setAccounts, firmNames = [] }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [firmName, setFirmName] = useState('');
  const [accountSize, setAccountSize] = useState<number | ''>('');
  const [cost, setCost] = useState<number | ''>('');
  const [activationFee, setActivationFee] = useState<number | ''>('');
  const [phase, setPhase] = useState<'Phase 1' | 'Phase 2' | 'Phase 3' | 'Instant Funded' | 'Funded' | 'Failed'>('Phase 1');
  const [isGiveaway, setIsGiveaway] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('MT5');
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState<number | ''>('');
  const [dailyLossLimit, setDailyLossLimit] = useState<number | ''>('');
  const [profitTarget, setProfitTarget] = useState<number | ''>('');
  const [payoutFrequency, setPayoutFrequency] = useState<'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'On-Demand'>('Bi-Weekly');
  const [nextPayoutDate, setNextPayoutDate] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setFirmName('');
    setAccountSize('');
    setCost('');
    setActivationFee('');
    setIsGiveaway(false);
    setPhase('Phase 1');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPlatform('MT5');
    setMaxDrawdownLimit('');
    setDailyLossLimit('');
    setProfitTarget('');
    setPayoutFrequency('Bi-Weekly');
    setNextPayoutDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: PropFirmChallenge) => {
    setEditingId(c.id);
    setFirmName(c.firmName);
    setAccountSize(c.accountSize);
    setCost(c.cost);
    setActivationFee(c.activationFee || '');
    setIsGiveaway(c.isGiveaway || false);
    setPhase(c.phase as any);
    setPurchaseDate(c.purchaseDate);
    setPlatform(c.platform || 'MT5');
    setMaxDrawdownLimit(c.maxDrawdownLimit || '');
    setDailyLossLimit(c.dailyLossLimit || '');
    setProfitTarget(c.profitTarget || '');
    setPayoutFrequency(c.payoutFrequency || 'Bi-Weekly');
    setNextPayoutDate(c.nextPayoutDate || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      let isNewlyFunded = false;

      if (editingId) {
        const originalChallenge = challenges.find(c => c.id === editingId);
        let newStatusUpdatedAt = originalChallenge?.statusUpdatedAt;
        
        if (originalChallenge && (originalChallenge.phase !== 'Funded' && originalChallenge.phase !== 'Instant Funded') && (phase === 'Funded' || phase === 'Instant Funded')) {
          isNewlyFunded = true;
        }
        
        if (originalChallenge && originalChallenge.phase !== 'Failed' && phase === 'Failed') {
          newStatusUpdatedAt = new Date().toISOString().split('T')[0];
        }

        const updatedFields = {
          firmName, accountSize: Number(accountSize), cost: isGiveaway ? 0 : Number(cost), activationFee: isGiveaway ? null : (activationFee ? Number(activationFee) : null), isGiveaway, phase, purchaseDate, platform,
          maxDrawdownLimit: maxDrawdownLimit ? Number(maxDrawdownLimit) : undefined,
          dailyLossLimit: dailyLossLimit ? Number(dailyLossLimit) : undefined,
          profitTarget: profitTarget ? Number(profitTarget) : undefined,
          payoutFrequency,
          nextPayoutDate: nextPayoutDate || undefined,
          statusUpdatedAt: newStatusUpdatedAt
        };
        const updated = challenges.map(c => c.id === editingId ? { ...c, ...updatedFields } : c);
        if (user.uid.startsWith('guest_offline_')) {
          localStorage.setItem(`propFirmChallenges_${user.uid}`, JSON.stringify(updated));
        } else {
          await updateDoc(doc(db, 'propFirmChallenges', editingId), {
            ...updatedFields,
            statusUpdatedAt: newStatusUpdatedAt || null
          });
        }
        if (setChallenges) setChallenges(updated);
      } else {
        if (phase === 'Funded' || phase === 'Instant Funded') isNewlyFunded = true;
        
        const docRef = doc(collection(db, 'propFirmChallenges'));
        const newChallenge: PropFirmChallenge = {
          id: docRef.id,
          userId: user.uid,
          firmName,
          accountSize: Number(accountSize),
          cost: isGiveaway ? 0 : Number(cost),
          activationFee: isGiveaway ? null : (activationFee ? Number(activationFee) : null),
          isGiveaway,
          phase,
          purchaseDate,
          platform,
          maxDrawdownLimit: maxDrawdownLimit ? Number(maxDrawdownLimit) : undefined,
          dailyLossLimit: dailyLossLimit ? Number(dailyLossLimit) : undefined,
          profitTarget: profitTarget ? Number(profitTarget) : undefined,
          payoutFrequency,
          nextPayoutDate: nextPayoutDate || undefined,
          statusUpdatedAt: phase === 'Failed' ? new Date().toISOString().split('T')[0] : undefined,
          createdAt: new Date().toISOString()
        };
        
        if (user.uid.startsWith('guest_offline_')) {
          localStorage.setItem(`propFirmChallenges_${user.uid}`, JSON.stringify([...challenges, newChallenge]));
        } else {
          await setDoc(docRef, newChallenge);
        }
        if (setChallenges) setChallenges(prev => [...prev.filter(c => c.id !== newChallenge.id), newChallenge]);
      }

      if (isNewlyFunded) {
        // Auto-create a funded account
        const accDocRef = doc(collection(db, 'propFirmAccounts'));
        const newAccount: PropFirmAccount = {
          id: accDocRef.id,
          userId: user.uid,
          firmName,
          accountName: `${firmName} Funded`,
          accountSize: Number(accountSize),
          currentBalance: Number(accountSize),
          status: 'Active',
          maxDrawdownLimit: maxDrawdownLimit ? Number(maxDrawdownLimit) : Number(accountSize) * 0.9, 
          dailyLossLimit: dailyLossLimit ? Number(dailyLossLimit) : Number(accountSize) * 0.95, 
          profitTarget: profitTarget ? Number(profitTarget) : undefined,
          payoutFrequency,
          nextPayoutDate: nextPayoutDate || undefined,
          createdAt: new Date().toISOString()
        };

        if (user.uid.startsWith('guest_offline_')) {
          localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify([...accounts, newAccount]));
        } else {
          await setDoc(accDocRef, newAccount);
        }
        if (setAccounts) setAccounts(prev => [...prev.filter(a => a.id !== newAccount.id), newAccount]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error saving challenge. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      if (user.uid.startsWith('guest_offline_')) {
        const updated = challenges.filter(c => c.id !== id);
        localStorage.setItem(`propFirmChallenges_${user.uid}`, JSON.stringify(updated));
        if (setChallenges) setChallenges(updated);
      } else {
        await deleteDoc(doc(db, 'propFirmChallenges', id));
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting challenge');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-row justify-between items-center gap-3 px-1 mb-2">
        <div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center">
            Challenges
          </p>
          <p className="text-xs text-slate-500 font-bold mt-0.5">Log and manage your prop firm evaluations</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-sm text-xs cursor-pointer whitespace-nowrap"
        >
          <Plus size={14} />
          <span>Add Challenge</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-150 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-150 flex justify-between items-center bg-slate-50/45">
          <span className="text-xs font-bold text-slate-700 capitalize">
            Active Challenges ({challenges.length})
          </span>
        </div>

        {challenges.length === 0 ? (
          <div className="p-8 text-center text-slate-450 bg-white text-xs">
            <Activity size={32} className="mx-auto mb-2 opacity-20" />
            <p>No challenges found. Click "Add Challenge" to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20 text-xs font-bold text-slate-500 border-b border-slate-100">
                  <th className="p-2 px-3 whitespace-nowrap">Firm / Platform</th>
                  <th className="p-2 whitespace-nowrap">Phase</th>
                  <th className="p-2 whitespace-nowrap">Account Size</th>
                  <th className="p-2 whitespace-nowrap">Cost / Fee</th>
                  <th className="p-2 font-mono whitespace-nowrap">Date</th>
                  <th className="p-2 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-750 ">
                {challenges.map(c => {
                  let isLocked = false;
                  if (c.phase === 'Failed' && c.statusUpdatedAt) {
                    const diffTime = new Date().getTime() - new Date(c.statusUpdatedAt).getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    if (diffDays >= 5) isLocked = true;
                  }

                  return (
                  <tr key={c.id} className="">
                    <td className="p-2 px-3 whitespace-nowrap">
                      <div className="font-extrabold text-slate-800">{c.firmName}</div>
                      <div className="text-xs text-slate-500 font-bold mt-0.5">{c.platform}</div>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                        c.phase === 'Funded' ? 'bg-emerald-100 text-emerald-800' :
                        c.phase === 'Instant Funded' ? 'bg-teal-100 text-teal-800' :
                        c.phase === 'Phase 1' ? 'bg-sky-100 text-sky-800' :
                        c.phase === 'Phase 2' ? 'bg-violet-100 text-violet-800' :
                        c.phase === 'Phase 3' ? 'bg-pink-100 text-pink-800' :
                        c.phase === 'Failed' ? 'bg-rose-100 text-rose-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {c.phase}
                      </span>
                      {c.isGiveaway && (
                        <span className="inline-block ml-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                          Giveaway
                        </span>
                      )}
                    </td>
                    <td className="p-2 font-bold font-mono text-xs text-slate-800 whitespace-nowrap">
                      ${c.accountSize.toLocaleString()}
                    </td>
                    <td className="p-2 font-bold font-mono text-xs text-rose-600 whitespace-nowrap">
                      -${c.cost.toLocaleString()}
                      {c.activationFee ? <span className="block text-xs text-amber-600 mt-0.5">Activation: -${c.activationFee.toLocaleString()}</span> : null}
                    </td>
                    <td className="p-2 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {c.purchaseDate}
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      {isLocked ? (
                        <div className="flex justify-end gap-1.5 text-slate-300" title="Locked (Failed over 5 days ago)">
                          <Lock size={12} className="m-1" />
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5 text-slate-500">
                          <button onClick={() => openEditModal(c)} className="p-1 hover:text-slate-900 rounded cursor-pointer transition-colors"><Edit2 size={12} /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1 hover:text-red-650 rounded cursor-pointer transition-colors"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-sm w-full max-w-lg flex flex-col max-h-[95vh]">
              <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800">{editingId ? 'Edit Challenge' : 'New Challenge'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto scrollbar-thin">
                <div>
                  <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Firm Name</label>
                  <input required type="text" list="challenge-firm-names" value={firmName} onChange={e => setFirmName(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="e.g. FTMO, MyFundedFX" />
                  <datalist id="challenge-firm-names">
                    {firmNames.map((firm, i) => <option key={i} value={firm} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Account Size ($)</label>
                  <input required type="number" value={accountSize} onChange={e => setAccountSize(e.target.value ? Number(e.target.value) : '')} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="100000" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isGiveawayCheckbox" checked={isGiveaway} onChange={e => setIsGiveaway(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                  <label htmlFor="isGiveawayCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">Won in a Giveaway (Free Account)</label>
                </div>
                {!isGiveaway && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Cost ($)</label>
                      <input required type="number" value={cost} onChange={e => setCost(e.target.value ? Number(e.target.value) : '')} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="499" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Activation Fee ($)</label>
                      <input type="number" value={activationFee} onChange={e => setActivationFee(e.target.value ? Number(e.target.value) : '')} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="Optional" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Phase</label>
                    <select value={phase} onChange={e => setPhase(e.target.value as any)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium">
                      <option value="Phase 1">Phase 1</option>
                      <option value="Phase 2">Phase 2</option>
                      <option value="Phase 3">Phase 3</option>
                      <option value="Instant Funded">Instant Funded</option>
                      <option value="Funded">Funded</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Platform</label>
                    <input type="text" value={platform} onChange={e => setPlatform(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="MT5, cTrader..." />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Purchase Date</label>
                  <input required type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" />
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-600">Pre-fill Account Data (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Max Drawdown Limit ($)</label>
                      <input type="number" value={maxDrawdownLimit} onChange={e => setMaxDrawdownLimit(e.target.value ? Number(e.target.value) : '')} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="Auto 10%" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Daily Loss Limit ($)</label>
                      <input type="number" value={dailyLossLimit} onChange={e => setDailyLossLimit(e.target.value ? Number(e.target.value) : '')} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="Auto 5%" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Profit Target ($)</label>
                      <input type="number" value={profitTarget} onChange={e => setProfitTarget(e.target.value ? Number(e.target.value) : '')} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Payout Format</label>
                      <select value={payoutFrequency} onChange={e => setPayoutFrequency(e.target.value as any)} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium">
                        <option value="Bi-Weekly">Bi-Weekly</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Daily">Daily</option>
                        <option value="On-Demand">On-Demand</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Expected Payout Date</label>
                    <input type="date" value={nextPayoutDate} onChange={e => setNextPayoutDate(e.target.value)} className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2 justify-end shrink-0 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" disabled={isSaving} className="px-4 py-2 font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
                    {isSaving ? <span className="text-xs">Saving...</span> : <><CheckCircle size={16} />Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      
    </div>
  );
}



