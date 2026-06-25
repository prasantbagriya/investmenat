import React, { useState } from 'react';
import { PhysicalAsset } from '../types';
import { Home, Car, Gem, Plus, Trash2, Edit2, Check, X, TrendingUp } from 'lucide-react';

interface PhysicalAssetsProps {
  assets: PhysicalAsset[];
  onAdd: (data: Omit<PhysicalAsset, 'id' | 'userId'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<PhysicalAsset>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const PhysicalAssets: React.FC<PhysicalAssetsProps> = ({ assets, onAdd, onEdit, onDelete }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Real Estate' as PhysicalAsset['type'],
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    currentValue: '',
    notes: ''
  });

  const [editValue, setEditValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.purchasePrice || !formData.currentValue) return;

    await onAdd({
      name: formData.name,
      type: formData.type,
      purchasePrice: Number(formData.purchasePrice),
      purchaseDate: formData.purchaseDate,
      currentValue: Number(formData.currentValue),
      notes: formData.notes
    });

    setShowAddForm(false);
    setFormData({
      name: '',
      type: 'Real Estate',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      currentValue: '',
      notes: ''
    });
  };

  const startEdit = (asset: PhysicalAsset) => {
    setEditingId(asset.id);
    setEditValue(asset.currentValue.toString());
  };

  const saveEdit = async (id: string) => {
    const val = Number(editValue);
    if (!isNaN(val) && val > 0) {
      await onEdit(id, { currentValue: val });
    }
    setEditingId(null);
  };

  const getAssetIcon = (type: PhysicalAsset['type']) => {
    switch (type) {
      case 'Real Estate': return <Home className="w-5 h-5 text-blue-500" />;
      case 'Vehicle': return <Car className="w-5 h-5 text-purple-500" />;
      case 'Gold': return <Gem className="w-5 h-5 text-yellow-500" />;
      default: return <TrendingUp className="w-5 h-5 text-gray-500" />;
    }
  };

  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/40">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Physical Assets</h2>
          <p className="text-gray-500 text-sm mt-1">Track illiquid wealth like real estate, gold, and vehicles</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="text-2xl font-bold text-indigo-600">₹{totalValue.toLocaleString('en-IN')}</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Add Asset'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g. Apartment, Gold Coins"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as PhysicalAsset['type'] }))}
              className="w-full rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="Real Estate">Real Estate</option>
              <option value="Gold">Gold</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (₹)</label>
            <input
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
              className="w-full rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              className="w-full rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Est. Value (₹)</label>
            <input
              type="number"
              value={formData.currentValue}
              onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
              className="w-full rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Save Asset
            </button>
          </div>
        </form>
      )}

      {assets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No physical assets added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map(asset => {
            const appreciation = asset.currentValue - asset.purchasePrice;
            const appreciationPct = (appreciation / asset.purchasePrice) * 100;
            const isPositive = appreciation >= 0;

            return (
              <div key={asset.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      {getAssetIcon(asset.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                      <p className="text-xs text-gray-500">{asset.type} • Bought {new Date(asset.purchaseDate).getFullYear()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Value</p>
                    {editingId === asset.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-lg border-gray-200 py-1 px-2 text-sm"
                        />
                        <button onClick={() => saveEdit(asset.id)} className="p-1.5 text-green-600 bg-green-50 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-red-600 bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <p className="text-xl font-bold text-gray-900">₹{asset.currentValue.toLocaleString('en-IN')}</p>
                        <button 
                          onClick={() => startEdit(asset)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                    <span className="text-gray-500">Purchase Price:</span>
                    <span className="font-medium text-gray-900">₹{asset.purchasePrice.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Appreciation:</span>
                    <span className={`font-medium flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : '-'}₹{Math.abs(appreciation).toLocaleString('en-IN')}
                      <span className="text-xs bg-gray-50 px-1.5 py-0.5 rounded">
                        {Math.abs(appreciationPct).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
