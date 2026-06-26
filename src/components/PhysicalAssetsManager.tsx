import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, X, Car, Home, Camera, Diamond, MoreHorizontal, Save, Calculator } from 'lucide-react';
import { PhysicalAsset } from '../types';

interface PhysicalAssetsManagerProps {
  assets: PhysicalAsset[];
  onAdd: (asset: Omit<PhysicalAsset, 'id' | 'userId'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<PhysicalAsset>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function PhysicalAssetsManager({ assets, onAdd, onEdit, onDelete }: PhysicalAssetsManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<PhysicalAsset['type']>('Vehicle');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentEstimatedValue, setCurrentEstimatedValue] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const openAddForm = () => {
    setEditingId(null);
    setName('');
    setType('Vehicle');
    setPurchasePrice('');
    setCurrentEstimatedValue('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsFormOpen(true);
  };

  const openEditForm = (asset: PhysicalAsset) => {
    setEditingId(asset.id);
    setName(asset.name);
    setType(asset.type);
    setPurchasePrice(asset.purchasePrice.toString());
    setCurrentEstimatedValue(asset.currentEstimatedValue ? asset.currentEstimatedValue.toString() : asset.purchasePrice.toString());
    setPurchaseDate(asset.purchaseDate);
    setNotes(asset.notes || '');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pp = parseFloat(purchasePrice);
    const cv = parseFloat(currentEstimatedValue);
    if (isNaN(pp) || isNaN(cv)) return;

    const payload: Omit<PhysicalAsset, 'id' | 'userId'> = {
      name: name.trim(),
      type,
      purchasePrice: pp,
      currentEstimatedValue: cv,
      purchaseDate,
      notes: notes.trim() || undefined
    };

    if (editingId) {
      await onEdit(editingId, payload);
    } else {
      await onAdd(payload);
    }
    setIsFormOpen(false);
  };

  const getIcon = (t: PhysicalAsset['type']) => {
    switch(t) {
      case 'Vehicle': return <Car size={20} className="text-blue-500" />;
      case 'Property': return <Home size={20} className="text-emerald-500" />;
      case 'Jewellery': return <Diamond size={20} className="text-purple-500" />;
      case 'Electronics': return <Camera size={20} className="text-orange-500" />;
      default: return <MoreHorizontal size={20} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Asset Management</h2>
          <p className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
            <Car size={20} className="text-indigo-600" /> Physical Assets
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
        >
          <Plus size={14} /> Log Asset
        </button>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg relative"
          >
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
              {editingId ? <><Edit2 size={14} className="text-indigo-600" /> Update Asset Valuation</> : <><Plus size={14} className="text-indigo-600" /> Add New Physical Asset</>}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Asset Name</label>
                <input required placeholder="e.g. Royal Enfield, Apartment" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Asset Category</label>
                <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none">
                  <option value="Vehicle">Vehicle / Auto</option>
                  <option value="Property">Real Estate / Land</option>
                  <option value="Jewellery">Gold / Jewellery</option>
                  <option value="Electronics">Electronics / Gadgets</option>
                  <option value="Other">Other Assets</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Purchase Price (₹)</label>
                <input required type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full font-mono border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1 flex justify-between">
                  <span>Current Valuation (₹)</span>
                  <span className="text-[9px] text-indigo-500 font-normal flex items-center gap-0.5"><Calculator size={10}/> Estimate</span>
                </label>
                <input required type="number" step="0.01" value={currentEstimatedValue} onChange={e => setCurrentEstimatedValue(e.target.value)} className="w-full font-mono border border-slate-200 rounded-lg p-2 text-sm bg-indigo-50/30 focus:bg-white focus:outline-none border-indigo-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Purchase Date</label>
                <input required type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full font-mono border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Details / Notes</label>
                <input placeholder="Registration No, Location, etc." value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                  <Save size={14} /> {editingId ? 'Save Valuation' : 'Log Asset'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List of Assets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {assets.length === 0 ? (
          <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-white">
            <Car size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No physical assets logged yet.</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">Track your bikes, cars, property, and gold here to include them in your net worth.</p>
            <button onClick={openAddForm} className="mt-3 text-indigo-600 font-bold text-xs hover:underline cursor-pointer">+ Add your first asset</button>
          </div>
        ) : (
          assets.map(a => {
            const appreciation = a.currentEstimatedValue - a.purchasePrice;
            const pct = a.purchasePrice > 0 ? (appreciation / a.purchasePrice) * 100 : 0;
            return (
              <motion.div 
                key={a.id} 
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {getIcon(a.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{a.name}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{a.type} • {a.purchaseDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditForm(a)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => { if(window.confirm('Delete this asset?')) onDelete(a.id); }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase</p>
                    <p className="font-mono font-semibold text-slate-700 text-sm">₹{a.purchasePrice.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valuation</p>
                    <p className="font-mono font-black text-slate-900 text-sm">₹{a.currentEstimatedValue.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                
                {appreciation !== 0 && (
                  <div className={`mt-2 text-[10px] font-bold px-2 py-1 rounded-md inline-block text-center w-full ${appreciation > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {appreciation > 0 ? '+' : ''}₹{appreciation.toLocaleString('en-IN')} ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
