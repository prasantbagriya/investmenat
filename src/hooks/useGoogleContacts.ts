import { useState, useEffect } from 'react';
import { getAccessToken, setAccessToken, db } from '../firebase';
import { GoogleContact } from '../components/ContactsManager';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function useGoogleContacts(user: any) {
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    loadContactsList();
    
    const handleTokenChange = () => {
      loadContactsList();
    };
    window.addEventListener('google-token-changed', handleTokenChange);
    return () => window.removeEventListener('google-token-changed', handleTokenChange);
  }, [user?.uid]);

  const loadLocalContacts = async () => {
    const local = localStorage.getItem(`local_contacts_${user?.uid || 'guest'}`);
    if (local) {
      try {
        setContacts(JSON.parse(local));
      } catch (e) {
        console.error('Failed to parse local contacts:', e);
      }
    }
    
    // Fallback to Firebase if not found in local storage or to ensure it matches Firebase
    if (user && !user.uid.startsWith('guest_offline_')) {
      try {
        const docRef = doc(db, 'googleContacts', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.contacts) {
            setContacts(data.contacts);
            localStorage.setItem(`local_contacts_${user.uid}`, JSON.stringify(data.contacts));
          }
        }
      } catch (e) {
        console.error('Failed to fetch contacts from Firebase:', e);
      }
    }
  };

  const loadContactsList = async () => {
    // Load local cache immediately for fast initial render
    loadLocalContacts();

    const activeToken = getAccessToken();
    
    if (!activeToken || (user && user.uid.startsWith('guest_offline_'))) {
      setLoadingContacts(false);
      return;
    }

    setLoadingContacts(true);

    try {
      const res = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations&pageSize=150', {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // Token expired — clear it and notify the app, then load local fallback
          console.warn('[useGoogleContacts] Access token expired (401). Clearing token and falling back to local contacts.');
          setAccessToken(null);
          window.dispatchEvent(new Event('google-token-changed'));
          loadLocalContacts();
        }
        setLoadingContacts(false);
        return;
      }

      const data = await res.json();
      const connections = data.connections || [];
      
      const parsedContacts: GoogleContact[] = connections.map((conn: any) => {
        const nameObj = conn.names?.[0] || {};
        const emailObj = conn.emailAddresses?.[0] || {};
        const phoneObj = conn.phoneNumbers?.[0] || {};
        const photoObj = conn.photos?.[0] || {};
        const orgObj = conn.organizations?.[0] || {};

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

      // Save to local storage for offline use and fast subsequent loads
      localStorage.setItem(`local_contacts_${user?.uid || 'guest'}`, JSON.stringify(parsedContacts));
      setContacts(parsedContacts);
      
      // Sync to Firebase
      if (user && !user.uid.startsWith('guest_offline_')) {
        try {
          const docRef = doc(db, 'googleContacts', user.uid);
          await setDoc(docRef, { contacts: parsedContacts }, { merge: true });
        } catch (e) {
          console.error('Failed to sync contacts to Firebase:', e);
        }
      }
    } catch (err: any) {
      console.error('[useGoogleContacts] Failed to load contacts:', err);
      await loadLocalContacts(); // fallback on network error too
    } finally {
      setLoadingContacts(false);
    }
  };

  return { contacts, loadingContacts, reloadContacts: loadContactsList };
}
