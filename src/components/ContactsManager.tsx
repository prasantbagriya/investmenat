import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Plus, Search, Trash2, Edit3, Phone, Mail, UserPlus, RefreshCw, 
  AlertCircle, CheckCircle2, UserCheck, X, Save, BookOpen, Clock, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { getAccessToken, setAccessToken, signInWithGoogle, logout } from '../firebase';
import { PendingPayment, Transaction } from '../types';

export interface GoogleContact {
  resourceName: string;
  etag: string;
  name: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  organization?: string;
  category?: 'Family' | 'Business' | 'Friend' | 'Lender' | 'General';
}

interface ContactsManagerProps {
  user: any;
  pendingPayments: PendingPayment[];
  transactions: Transaction[];
  onAddPayment?: (payData: Omit<PendingPayment, 'id' | 'userId'>) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export default function ContactsManager({
  user,
  pendingPayments,
  transactions,
  onAddPayment,
  onNavigateToTab
}: ContactsManagerProps) {
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  
  // Create/Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<GoogleContact | null>(null);
  const [formGivenName, setFormGivenName] = useState('');
  const [formFamilyName, setFormFamilyName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formCategory, setFormCategory] = useState<'Family' | 'Business' | 'Friend' | 'Lender' | 'General'>('General');
  
  // Connect with money flow/due modal
  const [isDueFormOpen, setIsDueFormOpen] = useState(false);
  const [selectedContactForDue, setSelectedContactForDue] = useState<GoogleContact | null>(null);
  const [dueAmount, setDueAmount] = useState('');
  const [dueType, setDueType] = useState<'owe' | 'owed'>('owe');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueNotes, setDueNotes] = useState('');
  
  // Check if offline/guest mode
  const isLocalStorageMode = useMemo(() => {
    return !user || user.uid.startsWith('guest_offline_') || !token;
  }, [user, token]);

  const [isContactsLinked, setIsContactsLinked] = useState(() => {
    const stored = localStorage.getItem('google_contacts_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 30));
  };

  useEffect(() => {
    const handleTokenChange = () => {
      const activeToken = getAccessToken();
      setToken(activeToken);
      const stored = localStorage.getItem('google_contacts_linked');
      if (stored === null) {
        setIsContactsLinked(!!activeToken);
      } else {
        setIsContactsLinked(stored === 'true' && !!activeToken);
      }
    };
    window.addEventListener('google-token-changed', handleTokenChange);
    return () => window.removeEventListener('google-token-changed', handleTokenChange);
  }, []);

  // Sync token from utility on change event
  useEffect(() => {
    const handleTokenChange = () => {
      setToken(getAccessToken());
    };
    window.addEventListener('google-token-changed', handleTokenChange);
    return () => window.removeEventListener('google-token-changed', handleTokenChange);
  }, []);

  // Sync token from utility
  useEffect(() => {
    const activeToken = getAccessToken();
    if (activeToken) {
      setToken(activeToken);
    }
  }, [user]);

  const handleClearToken = () => {
    setAccessToken(null);
    setToken(null);
    addLog("🗑️ Access token cleared successfully.");
    window.dispatchEvent(new Event('google-token-changed'));
  };

  // Load Contacts based on Mode
  useEffect(() => {
    loadContactsList();
  }, [user, token]);

  const loadContactsList = async () => {
    setLoading(true);
    const activeToken = token || getAccessToken();
    
    if (!activeToken || (user && user.uid.startsWith('guest_offline_'))) {
      addLog('📂 Running on Instant Local Mode. Saving contacts in responsive offline safe-house...');
      const local = localStorage.getItem(`local_contacts_${user?.uid || 'guest'}`);
      if (local) {
        try {
          setContacts(JSON.parse(local));
        } catch (e) {
          console.error(e);
        }
      } else {
        // Seed initial local contacts for an engaging default sandbox
        const initialContacts: GoogleContact[] = [
          {
            resourceName: 'local/c1',
            etag: 'seed1',
            name: 'Prashant Bagriya',
            givenName: 'Prashant',
            familyName: 'Bagriya',
            email: 'prashant@investmant.local',
            phone: '+91 98765 43210',
            organization: 'InvestMant Core',
            category: 'Business'
          },
          {
            resourceName: 'local/c2',
            etag: 'seed2',
            name: 'Ramesh Sharma',
            givenName: 'Ramesh',
            familyName: 'Sharma',
            email: 'ramesh.sharma@gmail.com',
            phone: '+91 99112 23344',
            organization: 'SBI Security Dev',
            category: 'Lender'
          },
          {
            resourceName: 'local/c3',
            etag: 'seed3',
            name: 'Sonia Verma',
            givenName: 'Sonia',
            familyName: 'Verma',
            email: 'sonia.v@outlook.com',
            phone: '+91 88776 65544',
            organization: 'Family Trust',
            category: 'Family'
          }
        ];
        setContacts(initialContacts);
        localStorage.setItem(`local_contacts_${user?.uid || 'guest'}`, JSON.stringify(initialContacts));
      }
      setLoading(false);
      return;
    }

    addLog('📡 Pinging Google People API endpoint connections...');
    try {
      const res = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations&pageSize=150', {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          addLog('⚠️ Token authentication expired. Please re-authenticate your Google Account.');
          setToken(null);
        } else {
          throw new Error(`API returned status ${res.status}`);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      const connections = data.connections || [];
      addLog(`✅ Successfully fetched ${connections.length} Google Contacts.`);
      
      const parsedContacts: GoogleContact[] = connections.map((conn: any) => {
        const nameObj = conn.names?.[0] || {};
        const emailObj = conn.emailAddresses?.[0] || {};
        const phoneObj = conn.phoneNumbers?.[0] || {};
        const photoObj = conn.photos?.[0] || {};
        const orgObj = conn.organizations?.[0] || {};

        // Retrieve local tag custom metadata from localStorage to persist custom categorizations for cloud entities
        const customMetaStr = localStorage.getItem(`contact_meta_${conn.resourceName}`);
        let category: any = 'General';
        if (customMetaStr) {
          try {
            category = JSON.parse(customMetaStr).category || 'General';
          } catch (e) {}
        }

        return {
          resourceName: conn.resourceName,
          etag: conn.etag,
          name: nameObj.displayName || 'Unnamed Contact',
          givenName: nameObj.givenName || '',
          familyName: nameObj.familyName || '',
          email: emailObj.value || '',
          phone: phoneObj.value || '',
          photoUrl: photoObj.url || '',
          organization: orgObj.name || '',
          category
        };
      });

      setContacts(parsedContacts);
    } catch (err: any) {
      addLog(`❌ Failed to read Contacts: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (contact?: GoogleContact) => {
    if (contact) {
      setEditingContact(contact);
      setFormGivenName(contact.givenName || '');
      setFormFamilyName(contact.familyName || '');
      setFormEmail(contact.email || '');
      setFormPhone(contact.phone || '');
      setFormOrg(contact.organization || '');
      setFormCategory(contact.category || 'General');
    } else {
      setEditingContact(null);
      setFormGivenName('');
      setFormFamilyName('');
      setFormEmail('');
      setFormPhone('');
      setFormOrg('');
      setFormCategory('General');
    }
    setIsFormOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGivenName.trim()) {
      alert('Given Name is required.');
      return;
    }

    setLoading(true);
    const fullName = `${formGivenName} ${formFamilyName}`.trim();

    if (isLocalStorageMode) {
      // Handle Local Mode Save/Update
      let updatedContacts = [...contacts];
      if (editingContact) {
        updatedContacts = contacts.map(c => {
          if (c.resourceName === editingContact.resourceName) {
            return {
              ...c,
              name: fullName,
              givenName: formGivenName,
              familyName: formFamilyName,
              email: formEmail,
              phone: formPhone,
              organization: formOrg,
              category: formCategory
            };
          }
          return c;
        });
        addLog(`💾 Updated contact offline: ${fullName}`);
      } else {
        const newLocalContact: GoogleContact = {
          resourceName: 'local/c_' + Math.random().toString(36).substring(2, 11),
          etag: 'local_etag_' + Date.now(),
          name: fullName,
          givenName: formGivenName,
          familyName: formFamilyName,
          email: formEmail,
          phone: formPhone,
          organization: formOrg,
          category: formCategory
        };
        updatedContacts = [newLocalContact, ...contacts];
        addLog(`💾 Created new contact offline: ${fullName}`);
      }
      setContacts(updatedContacts);
      localStorage.setItem(`local_contacts_${user?.uid || 'guest'}`, JSON.stringify(updatedContacts));
      setIsFormOpen(false);
      setLoading(false);
      return;
    }

    // Google API Save / Update Mode
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      alert('Authorizing session is stale. Please log in first.');
      setLoading(false);
      return;
    }

    try {
      if (editingContact) {
        addLog(`📡 Sending update request for ${editingContact.resourceName}...`);
        
        // Contacts PATCH update body structure
        const requestBody = {
          etag: editingContact.etag,
          names: [{ givenName: formGivenName, familyName: formFamilyName }],
          emailAddresses: formEmail ? [{ value: formEmail, type: 'primary' }] : [],
          phoneNumbers: formPhone ? [{ value: formPhone, type: 'mobile' }] : [],
          organizations: formOrg ? [{ name: formOrg, title: 'Associate' }] : []
        };

        const res = await fetch(`https://people.googleapis.com/v1/${editingContact.resourceName}:updateContact?updatePersonFields=names,emailAddresses,phoneNumbers,organizations`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          throw new Error(`Google API returned code ${res.status}`);
        }

        // Persist local category tag metadata
        localStorage.setItem(`contact_meta_${editingContact.resourceName}`, JSON.stringify({ category: formCategory }));
        addLog(`✅ Successfully updated Cloud Contact: ${fullName}`);
      } else {
        addLog(`📡 Sending create request into Google Contacts account...`);

        // Contacts POST create body structure
        const requestBody = {
          names: [{ givenName: formGivenName, familyName: formFamilyName }],
          emailAddresses: formEmail ? [{ value: formEmail, type: 'primary' }] : [],
          phoneNumbers: formPhone ? [{ value: formPhone, type: 'mobile' }] : [],
          organizations: formOrg ? [{ name: formOrg, title: 'Associate' }] : []
        };

        const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          throw new Error(`Google API returned code ${res.status}`);
        }

        const createdData = await res.json();
        // Persist local category tag metadata
        if (createdData.resourceName) {
          localStorage.setItem(`contact_meta_${createdData.resourceName}`, JSON.stringify({ category: formCategory }));
        }

        addLog(`✅ Successfully created Cloud Contact: ${fullName}`);
      }
      
      // Reload contacts from cloud
      await loadContactsList();
      setIsFormOpen(false);
    } catch (err: any) {
      addLog(`❌ Failed to synchronize action: ${err.message || err}`);
      alert(`Synchronize failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contact: GoogleContact) => {
    const isConfirmed = window.confirm(`Are you sure you want to permanently delete Google Contact "${contact.name}"? This action cannot be undone on Google servers.`);
    if (!isConfirmed) return;

    setLoading(true);
    if (isLocalStorageMode) {
      const updated = contacts.filter(c => c.resourceName !== contact.resourceName);
      setContacts(updated);
      localStorage.setItem(`local_contacts_${user?.uid || 'guest'}`, JSON.stringify(updated));
      addLog(`🗑️ Deleted local contact: ${contact.name}`);
      setLoading(false);
      return;
    }

    const activeToken = token || getAccessToken();
    if (!activeToken) {
      alert('OAuth session is missing. Log in to delete contacts.');
      setLoading(false);
      return;
    }

    try {
      addLog(`📡 Sending delete call for contact resource: ${contact.resourceName}`);
      const res = await fetch(`https://people.googleapis.com/v1/${contact.resourceName}:deleteContact`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });

      if (!res.ok) {
        throw new Error(`Google API returned status ${res.status}`);
      }

      localStorage.removeItem(`contact_meta_${contact.resourceName}`);
      addLog(`✅ Deleted contact from cloud: ${contact.name}`);
      await loadContactsList();
    } catch (err: any) {
      addLog(`❌ Delete operation failed: ${err.message || err}`);
      alert(`Delete failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Associate money flow pending payments
  const handleOpenDueForm = (contact: GoogleContact) => {
    setSelectedContactForDue(contact);
    setDueAmount('');
    setDueType('owe');
    setDueDate(new Date().toISOString().split('T')[0]);
    setDueNotes(`Reference Contact: ${contact.name}`);
    setIsDueFormOpen(true);
  };

  const handleSaveDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactForDue || !dueAmount || parseFloat(dueAmount) <= 0) {
      alert('Please fill general requirements correctly.');
      return;
    }

    try {
      if (onAddPayment) {
        await onAddPayment({
          type: dueType,
          person: selectedContactForDue.name,
          amount: parseFloat(dueAmount),
          dueDate: dueDate,
          completed: false,
          notes: `${dueNotes} ${selectedContactForDue.phone ? `(${selectedContactForDue.phone})` : ''}`.trim()
        });
        addLog(`💸 Linked new due payment of ₹${dueAmount} to ${selectedContactForDue.name}`);
        alert('Linked due payment successfully configured on the workspace!');
        setIsDueFormOpen(false);
      } else {
        alert('Due Payment action is not loaded. Try again shortly.');
      }
    } catch (err: any) {
      addLog(`❌ Failed to link pending payment: ${err.message}`);
    }
  };

  // Filter Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (c.phone && c.phone.includes(searchQuery)) ||
                            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (c.organization && c.organization.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag === 'All' || c.category === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [contacts, searchQuery, selectedTag]);

  // Derive connected financial insights
  const financialInsights = useMemo(() => {
    let totalOwedToGuest = 0; // Owed (we receive money)
    let totalOwedByGuest = 0; // Owe (we pay money)
    
    contacts.forEach(c => {
      const relatedOwe = pendingPayments.filter(p => !p.completed && p.person === c.name);
      relatedOwe.forEach(r => {
        if (r.type === 'owe') {
          totalOwedByGuest += r.amount;
        } else {
          totalOwedToGuest += r.amount;
        }
      });
    });

    return {
      totalOwedToGuest,
      totalOwedByGuest
    };
  }, [contacts, pendingPayments]);

  if (!isContactsLinked) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs font-sans max-w-4xl mx-auto text-center space-y-2" id="contacts-manager-container">
        <div className="mx-auto p-2 bg-indigo-50 text-indigo-700 rounded-3xl border border-indigo-100 w-16 h-16 flex items-center justify-center">
          <Users size={30} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Google Contacts Integration Disconnected</h2>
          <p className="text-xs text-slate-700 font-medium uppercase tracking-wider">Contacts Disabled</p>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto text-xs text-slate-600 leading-relaxed font-sans">
          👥 Google Contacts integration is currently deactivated. Setup must be initiated exclusively from the central <b>Settings</b> page/tab. We have hidden configuration blocks. Please toggle settings to complete authentication blocks in 1-Click!
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
    <div className="space-y-3 md:p-1" id="contacts-manager-container">
      {/* Visual Header / Banner */}
      <div className="bg-slate-900 rounded-3xl p-3 md:p-4 text-white relative overflow-hidden shadow-xl" id="contacts-headline-card">
        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
          <Users size={180} />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1 bg-slate-800 border border-slate-705 px-1 py-1 rounded-full text-xs font-semibold tracking-wider text-slate-300">
            <BookOpen size={12} className="text-emerald-400 animate-pulse" />
            Workspace Google Contacts Directory
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Financial Contacts & Rolodex</h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-xl mt-1 leading-relaxed">
              Seamless synchronization with Google People API. Link real contacts with pending ledgers, cash flows, and loan trackers directly with absolute safety.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 pt-1">
            <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 px-1 py-1.5 rounded-xl text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-200 font-semibold">Active Google Connection Status</span>
            </div>
            
            <button
              id="google-contacts-create-btn"
              onClick={() => handleOpenForm()}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold px-2 py-1.5 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <UserPlus size={14} className="text-slate-850" /> Add Contact Record
            </button>
          </div>
        </div>
      </div>

      {/* Financial Rolodex KPI Overview slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2" id="contacts-kpi-grid">
        <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-xs" id="contacts-kpi-total">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Rolodex Capacity</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-slate-900">{contacts.length}</span>
            <span className="text-xs text-slate-700">active associates</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-xs" id="contacts-kpi-owed-to">
          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">Total Money Receivable</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-650">₹{financialInsights.totalOwedToGuest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-emerald-600 font-semibold">from contacts</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-xs" id="contacts-kpi-owed-by">
          <p className="text-[10px] uppercase font-bold tracking-wider text-rose-500">Total Money Payable</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-rose-600">₹{financialInsights.totalOwedByGuest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-rose-500 font-semibold">to contacts</span>
          </div>
        </div>
      </div>

      {/* Filters & Workspace Grid */}
      <div className="bg-white rounded-2xl p-2 md:p-3 border border-slate-100 shadow-sm" id="contacts-workspace-card">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          {/* Tag Selectors */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide text-xs font-semibold" id="contacts-tags-group">
            {['All', 'Family', 'Business', 'Friend', 'Lender'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-1 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${selectedTag === tag ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Search bar input container */}
          <div className="relative max-w-sm w-full" id="contacts-search-box">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, organization, phone..."
              className="w-full text-xs pl-9 pr-2 py-1 borders border-slate-205 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:outline-none transition-all outline-none"
            />
          </div>
        </div>

        {/* Contacts Matrix */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-1" id="contacts-skeleton-loader">
            <RefreshCw className="h-8 w-8 text-slate-500 animate-spin" />
            <span className="text-xs text-slate-700 font-mono">Synchronizing directories...</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-1" id="contacts-empty-state">
            <Users className="h-10 w-10 text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No matching contacts</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              We couldn't find any contact records matching "{searchQuery}" under "{selectedTag}" group.
            </p>
            <button
              onClick={() => handleOpenForm()}
              className="mt-1 text-xs font-bold text-slate-900 hover:underline cursor-pointer"
            >
              Configure new contact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-3" id="contacts-results-matrix">
            <AnimatePresence>
              {filteredContacts.map((contact, index) => {
                // Find pending ledgers connected to this specific name
                const relatedCharges = pendingPayments.filter(p => !p.completed && p.person.toLowerCase() === contact.name.toLowerCase());
                const OweAmount = relatedCharges.filter(r => r.type === 'owe').reduce((acc, current) => acc + current.amount, 0);
                const OwedAmount = relatedCharges.filter(r => r.type === 'owed').reduce((acc, current) => acc + current.amount, 0);

                return (
                  <motion.div
                    key={contact.resourceName}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3) }}
                    className="border border-slate-100 hover:border-slate-300 rounded-2xl p-2 transition-all hover:shadow-md bg-white flex flex-col justify-between"
                    id={`contact-item-${contact.resourceName.replace(/\//g, '_')}`}
                  >
                    <div>
                      {/* Top Metadata Row */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {contact.photoUrl ? (
                            <img 
                              src={contact.photoUrl} 
                              alt={contact.name} 
                              referrerPolicy="no-referrer"
                              className="h-10 w-10 rounded-full border border-slate-100 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight flex items-center gap-1.5">
                              {contact.name}
                              {contact.category && (
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                  contact.category === 'Family' ? 'bg-indigo-50 text-indigo-650' :
                                  contact.category === 'Business' ? 'bg-slate-100 text-slate-700' :
                                  contact.category === 'Friend' ? 'bg-sky-50 text-sky-650' :
                                  contact.category === 'Lender' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-700'
                                }`}>
                                  {contact.category}
                                </span>
                              )}
                            </h4>
                            {contact.organization && (
                              <p className="text-[10px] text-slate-500 font-medium leading-none mt-1">{contact.organization}</p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            title="Edit Contact profile"
                            onClick={() => handleOpenForm(contact)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            title="Add Pending payment/due record"
                            onClick={() => handleOpenDueForm(contact)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Clock size={12} />
                          </button>
                          <button
                            title="Delete Contact"
                            onClick={() => handleDeleteContact(contact)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Communications Details */}
                      <div className="mt-2 space-y-1.5">
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-700">
                            <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="font-mono">{contact.phone}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-700 truncate">
                            <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Integrated Money Flow Widget */}
                    <div className="mt-2 pt-1 border-t border-slate-50 flex items-center justify-between text-[10px] font-mono">
                      {OweAmount === 0 && OwedAmount === 0 ? (
                        <span className="text-slate-500">No active dues link</span>
                      ) : (
                        <div className="flex flex-col gap-1 w-full">
                          {OwedAmount > 0 && (
                            <div className="flex items-center justify-between text-emerald-600 bg-emerald-50/50 p-1 px-1 rounded">
                              <span className="flex items-center gap-1"><ArrowUpRight size={10} /> Owed to me:</span>
                              <span className="font-bold">₹{OwedAmount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {OweAmount > 0 && (
                            <div className="flex items-center justify-between text-rose-500 bg-rose-50/50 p-1 px-1 rounded">
                              <span className="flex items-center gap-1"><ArrowDownLeft size={10} /> I owe them:</span>
                              <span className="font-bold">₹{OweAmount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setExpandedContact(expandedContact === contact.resourceName ? null : contact.resourceName)}
                      className="mt-2 w-full text-center text-[10px] font-bold text-slate-700 hover:text-slate-900 border border-slate-100 bg-slate-50 hover:bg-slate-100 py-1 rounded-md transition-colors"
                    >
                      {expandedContact === contact.resourceName ? 'Hide Track Record' : 'View Track Record'}
                    </button>

                    {expandedContact === contact.resourceName && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History</h5>
                        {(() => {
                          const history = pendingPayments.filter(p => p.person.toLowerCase() === contact.name.toLowerCase());
                          if (history.length === 0) return <p className="text-[10px] text-slate-500">No transactions recorded.</p>;
                          
                          return history.map(h => (
                            <div key={h.id} className="flex items-center justify-between text-[10px] bg-white border border-slate-100 p-1 rounded">
                              <div className="flex items-center gap-1">
                                {h.completed ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Clock size={10} className="text-amber-500" />}
                                <span className={h.completed ? 'text-slate-700 line-through' : 'text-slate-800'}>{h.dueDate}</span>
                              </div>
                              <span className={`font-mono font-bold ${h.type === 'owe' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {h.type === 'owe' ? '-' : '+'}₹{h.amount}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>



      {/* Dialogue Form Modal: Create / Edit Contact Object */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2" id="contact-form-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-3 md:p-4 max-w-md w-full shadow-2xl relative border border-slate-100"
          >
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {editingContact ? 'Edit Contact Record' : 'Add New Contact Record'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isLocalStorageMode ? 'Saving in Instant Local Offline Index' : 'Synchronizing direct with Google Servers'}
            </p>

            <form onSubmit={handleSaveContact} className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">First (Given) Name *</label>
                  <input
                    type="text"
                    required
                    value={formGivenName}
                    onChange={(e) => setFormGivenName(e.target.value)}
                    className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Surname (Family Name)</label>
                  <input
                    type="text"
                    value={formFamilyName}
                    onChange={(e) => setFormFamilyName(e.target.value)}
                    className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mobile / Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 99999 99999"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC, Zerodha"
                  value={formOrg}
                  onChange={(e) => setFormOrg(e.target.value)}
                  className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Associate Tag Classification</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                >
                  <option value="General">General Partner</option>
                  <option value="Family">Close Family</option>
                  <option value="Business">Business CounterParty</option>
                  <option value="Friend">Personal Friend</option>
                  <option value="Lender">Creditor / Lender</option>
                </select>
              </div>

              <div className="pt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-1 text-xs bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  {loading && <RefreshCw size={13} className="animate-spin" />}
                  Save Contact
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dialog Form Modal: Link Pending dues */}
      {isDueFormOpen && selectedContactForDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2" id="contact-due-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-3 md:p-4 max-w-md w-full shadow-2xl relative border border-slate-100"
          >
            <button
              onClick={() => setIsDueFormOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Config Pending Due for {selectedContactForDue.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Associate this record into your active Ledger Dues tracking stream
            </p>

            <form onSubmit={handleSaveDue} className="mt-3 space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Due Type</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setDueType('owe')}
                    className={`p-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      dueType === 'owe' 
                        ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs' 
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    I Owe Them (We Pay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueType('owed')}
                    className={`p-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      dueType === 'owed' 
                        ? 'bg-emerald-50 border-emerald-205 text-emerald-750 shadow-xs' 
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    They Owe Me (We Get)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Lump Sum Amount (INR) *</label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="0.00"
                  value={dueAmount}
                  onChange={(e) => setDueAmount(e.target.value)}
                  className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Payment Settlement Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notes / Terms</label>
                <textarea
                  placeholder="Terms, rate of interest, or security details..."
                  value={dueNotes}
                  onChange={(e) => setDueNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white b-border rounded-xl focus:ring-1 focus:ring-slate-900 focus:outline-none focus:border-slate-900 outline-none transition-colors border border-slate-200"
                />
              </div>

              <div className="pt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsDueFormOpen(false)}
                  className="flex-1 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Confirm Linked Due
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
