import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { setDoc, deleteDoc } from '../../firebase-sync';
import { db } from '../../firebase';
import { LedgerProfile } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Plus, User, Search } from 'lucide-react';
import { useGoogleContacts } from '../../hooks/useGoogleContacts';

interface LedgerListProps {
  onSelectProfile: (profile: LedgerProfile) => void;
  userId?: string;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
}

export const LedgerList: React.FC<LedgerListProps> = ({ onSelectProfile, userId, showAddForm, setShowAddForm }) => {
  const [profiles, setProfiles] = useState<LedgerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePhone, setNewProfilePhone] = useState('');
  const [newProfileAmount, setNewProfileAmount] = useState('');
  const [newProfileType, setNewProfileType] = useState<'gave' | 'got'>('gave');
  const [isSaving, setIsSaving] = useState(false);
  
  // Google Contacts Auto-complete state
  const { contacts } = useGoogleContacts({ uid: userId });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    if (!userId) return;

    const localData = JSON.parse(localStorage.getItem(`ledger_profiles_${userId}`) || '[]');
    if (localData.length > 0) {
      setProfiles(localData);
      setLoading(false);
    } else {
      setTimeout(() => setLoading(false), 1000);
    }

    const q = query(collection(db, 'ledger_profiles'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: LedgerProfile[] = [];
      snapshot.forEach(d => data.push(d.data() as LedgerProfile));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProfiles(data);
      localStorage.setItem(`ledger_profiles_${userId}`, JSON.stringify(data));
      setLoading(false);
    }, (error) => {
      console.warn("Firestore LedgerList error:", error);
      setLoading(false); 
    });
    return () => unsubscribe();
  }, [userId]);

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!userId || !newProfileName.trim() || isSaving) return;
    setIsSaving(true);

    const initialAmount = parseFloat(newProfileAmount);
    let netBalance = 0;
    
    if (!isNaN(initialAmount) && initialAmount > 0) {
      netBalance = newProfileType === 'gave' ? initialAmount : -initialAmount;
    }

    const newProfile: LedgerProfile = {
      id: uuidv4(),
      userId: userId,
      name: newProfileName.trim(),
      phone: newProfilePhone.trim(),
      netBalance: netBalance,
      createdAt: new Date().toISOString()
    };

    let initialTx: any = null;
    if (!isNaN(initialAmount) && initialAmount > 0) {
       initialTx = {
         id: uuidv4(),
         ledgerId: newProfile.id,
         userId: userId,
         type: newProfileType,
         amount: initialAmount,
         date: new Date().toISOString().split('T')[0],
         memo: 'Opening Balance',
         paymentMethod: 'cash',
         createdAt: new Date().toISOString()
       };
    }

    try {
      await setDoc(doc(db, 'ledger_profiles', newProfile.id), newProfile);
      if (initialTx) {
        await setDoc(doc(db, 'ledger_transactions', initialTx.id), initialTx);
      }
    } catch (err) {
      console.warn("Failed to add profile to cloud, saving locally", err);
    }
    
    setProfiles(prev => {
      if (prev.some(p => p.id === newProfile.id)) return prev;
      const updated = [...prev, newProfile].sort((a, b) => a.name.localeCompare(b.name));
      localStorage.setItem(`ledger_profiles_${userId}`, JSON.stringify(updated));
      return updated;
    });

    if (initialTx) {
      const localData = JSON.parse(localStorage.getItem(`ledger_tx_${newProfile.id}`) || '[]');
      localData.push(initialTx);
      localStorage.setItem(`ledger_tx_${newProfile.id}`, JSON.stringify(localData));
    }

    setNewProfileName('');
    setNewProfilePhone('');
    setNewProfileAmount('');
    setNewProfileType('gave');
    setShowAddForm(false);
    setIsSaving(false);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!userId || !confirm("Are you sure you want to delete this profile? All transactions will remain in DB but profile will be hidden.")) return;
    try {
      await deleteDoc(doc(db, 'ledger_profiles', profileId));
    } catch (err) {
      console.warn("Failed to delete profile from cloud", err);
    }
    setProfiles(prev => {
      const updated = prev.filter(p => p.id !== profileId);
      localStorage.setItem(`ledger_profiles_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const selectContact = (contact: any) => {
    setNewProfileName(contact.name);
    if (contact.phone) {
      setNewProfilePhone(contact.phone);
    }
    setShowSuggestions(false);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(newProfileName.toLowerCase()) || 
    (c.phone && c.phone.includes(newProfileName))
  );

  const totalOwe = profiles.filter(p => p.netBalance < 0).reduce((acc, p) => acc + Math.abs(p.netBalance), 0);
  const totalOwedToMe = profiles.filter(p => p.netBalance > 0).reduce((acc, p) => acc + p.netBalance, 0);
  const netTotal = totalOwedToMe - totalOwe;

  const filteredProfiles = profiles.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.phone && p.phone.includes(searchQuery))
  );

  const displayProfiles = searchQuery.trim() === '' ? filteredProfiles.slice(0, 10) : filteredProfiles;

  if (loading) return <div className="p-4 text-center text-xs text-slate-500">Loading Khata...</div>;

  return (
    <div className="space-y-3 pb-20">
      
      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-2 rounded-md border border-slate-200/80 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 ">I owe others</span>
            <span className="text-xs bg-red-50 text-red-700 px-1 py-0.5 rounded-full font-semibold scale-90">Debit Ledger</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-950 block">
              ₹{totalOwe.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white p-2 rounded-md border border-slate-200/80 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 ">Others owe me</span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded-full font-semibold scale-90">Credit Ledger</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-950 block">
              ₹{totalOwedToMe.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-white p-2 rounded-md border border-slate-200/80 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 ">Net Balance</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-1 py-0.5 rounded-full font-semibold scale-90 ">Ledger</span>
          </div>
          <div className="mt-1">
            <span className={`text-2xl font-bold tracking-tight block ${netTotal >= 0 ? 'text-slate-950' : 'text-rose-600'}`}>
              {netTotal < 0 ? '-' : ''}₹{Math.abs(netTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-md border border-slate-200/80 shadow-xs p-3 overflow-visible mt-3">
          <form onSubmit={handleAddProfile} className="space-y-3">
             <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                <h3 className="font-bold text-slate-900 text-xs ">
                  Create New Profile
                </h3>
             </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 relative" ref={wrapperRef}>
                <label className="text-xs font-bold text-slate-500 block ">Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Rahul, Amazon..."
                  value={newProfileName}
                  onChange={(e) => {
                    setNewProfileName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all "
                />
                
                {/* Google Contacts Autocomplete Dropdown */}
                {showSuggestions && newProfileName.length > 0 && filteredContacts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredContacts.map(contact => (
                      <div 
                        key={contact.resourceName}
                        onClick={() => selectContact(contact)}
                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-2"
                      >
                        {contact.photoUrl ? (
                          <img src={contact.photoUrl} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                            {contact.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{contact.name}</p>
                          {contact.phone && <p className="text-xs text-slate-500">{contact.phone}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!contacts.length && userId && !userId.startsWith('guest_offline_') && (
                   <p className="text-xs text-rose-500 mt-1 font-medium ">
                     Google Contacts disconnected. Re-connect in Settings to enable auto-sync.
                   </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block ">Phone / Reference (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={newProfilePhone}
                  onChange={(e) => setNewProfilePhone(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all "
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block ">Opening Amount (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-450 text-xs font-semibold">₹</span>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProfileAmount}
                    onChange={(e) => setNewProfileAmount(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block ">Transaction Type</label>
                <div className="flex bg-slate-100 p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => setNewProfileType('gave')}
                    className={`flex-1 text-xs py-1 rounded transition-colors font-semibold ${newProfileType === 'gave' ? 'bg-white shadow-xs text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    I Gave (They Owe Me)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProfileType('got')}
                    className={`flex-1 text-xs py-1 rounded transition-colors font-semibold ${newProfileType === 'got' ? 'bg-white shadow-xs text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    I Got (I Owe Them)
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      {profiles.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search profiles by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200/80 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white shadow-xs transition-all "
          />
        </div>
      )}

      <div className="bg-white rounded-md border border-slate-200/80 shadow-xs overflow-hidden">
        {profiles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white">
            <p className="text-xs font-medium">No ledger profiles found. Add a person to get started.</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white">
            <p className="text-xs font-medium">No profiles match "{searchQuery}".</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayProfiles.map(profile => (
              <div 
                key={profile.id} 
                className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer"
                onClick={() => onSelectProfile(profile)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border border-slate-200/50">
                    <User size={18} className="opacity-50" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{profile.name}</h3>
                    {profile.phone && <p className="text-xs text-slate-500 font-mono mt-0.5">{profile.phone}</p>}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${profile.netBalance === 0 ? 'text-slate-900' : profile.netBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {profile.netBalance < 0 ? '-' : ''}₹{Math.abs(profile.netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-bold mt-0.5 ${profile.netBalance === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                      {profile.netBalance === 0 ? 'Settled Up' : profile.netBalance > 0 ? 'You get' : 'You owe'}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            {searchQuery.trim() === '' && filteredProfiles.length > 10 && (
              <div className="p-3 text-center bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  Showing 10 of {filteredProfiles.length} profiles. Use search to find others.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
