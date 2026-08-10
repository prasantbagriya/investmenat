import React, { useState } from 'react';
import { LedgerList } from './LedgerList';
import { LedgerProfileView } from './LedgerProfileView';
import { LedgerProfile } from '../../types';
import { User } from 'firebase/auth';

interface LedgerPageProps {
  user: User | null;
}

export default function LedgerPage({ user }: LedgerPageProps) {
  const [selectedProfile, setSelectedProfile] = useState<LedgerProfile | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  if (selectedProfile) {
    return <LedgerProfileView profile={selectedProfile} onBack={() => setSelectedProfile(null)} userId={user?.uid} />;
  }

  return <LedgerList onSelectProfile={setSelectedProfile} userId={user?.uid} showAddForm={showAddForm} setShowAddForm={setShowAddForm} />;
}
