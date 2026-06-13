import React, { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { getAccessToken } from '../firebase';

interface GooglePickerProps {
  onSelect: (file: any) => void;
  apiKey?: string; // Optional: Some picker instances require an API key alongside OAuth Token
  label?: string;
}

export default function GooglePicker({ onSelect, apiKey, label = "Pick File from Google Drive" }: GooglePickerProps) {
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Load the Google API script dynamically
    if (window.gapi) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      // document.body.removeChild(script); // Keep script loaded across app
    };
  }, []);

  useEffect(() => {
    if (scriptLoaded && window.gapi) {
      window.gapi.load('picker', { callback: () => setPickerApiLoaded(true) });
    }
  }, [scriptLoaded]);

  const handleOpenPicker = () => {
    const token = getAccessToken();
    if (!token) {
      alert("You need to connect your Google Account first to access Google Drive.");
      return;
    }

    if (!pickerApiLoaded || !window.google || !window.google.picker) {
      alert("Google Picker API is still loading. Please try again in a moment.");
      return;
    }

    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    
    let pickerBuilder = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setCallback((data: any) => {
        if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
          const doc = data[window.google.picker.Response.DOCUMENTS][0];
          onSelect(doc);
        }
      });

    if (apiKey) {
      pickerBuilder = pickerBuilder.setDeveloperKey(apiKey);
    }

    const picker = pickerBuilder.build();
    picker.setVisible(true);
  };

  return (
    <button
      type="button"
      onClick={handleOpenPicker}
      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
    >
      <FolderOpen size={14} /> {label}
    </button>
  );
}
