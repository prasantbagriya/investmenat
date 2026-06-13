import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Mail, Video, CheckSquare, MessageSquare, FileText, 
  GraduationCap, Search, Upload, Send, Plus, RefreshCw, Check, Trash2, 
  ExternalLink, ChevronRight, AlertCircle, Sparkles, Presentation, MousePointerClick
} from 'lucide-react';
import { getAccessToken } from '../firebase';
import InfoTooltip from './InfoTooltip';
import GooglePicker from './GooglePicker';

interface WorkspaceSuiteProps {
  user: any;
  onNavigateToTab: (tab: string) => void;
}

// Service definition structure
type WorkspaceService = 'drive' | 'gmail' | 'meet' | 'tasks' | 'chat' | 'forms' | 'classroom' | 'docs' | 'picker' | 'slides';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
}

interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

interface ChatSpace {
  name: string;
  displayName?: string;
  type?: string;
}

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  alternateLink?: string;
}

export default function WorkspaceSuite({ user, onNavigateToTab }: WorkspaceSuiteProps) {
  const [activeService, setActiveService] = useState<WorkspaceService>('drive');
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for individual sub-services
  // 1. Google Drive states
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadFileContent, setUploadFileContent] = useState<string>('');

  // 2. Gmail states
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [gmailRecipient, setGmailRecipient] = useState<string>('');
  const [gmailSubject, setGmailSubject] = useState<string>('');
  const [gmailBody, setGmailBody] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // 3. Meet states
  const [createdMeetLink, setCreatedMeetLink] = useState<string | null>(null);
  const [meetTitle, setMeetTitle] = useState<string>('Instant Sync Meeting');

  // 4. Tasks states
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [newTaskListTitle, setNewTaskListTitle] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');

  // 5. Chat states
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpaceName, setSelectedSpaceName] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');

  // 6. Forms states
  const [formsList, setFormsList] = useState<DriveFile[]>([]);
  const [newFormTitle, setNewFormTitle] = useState<string>('Feedback Form');

  // 7. Classroom states
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);

  // Listen for changes in Google token
  useEffect(() => {
    const handleTokenChange = () => {
      setToken(getAccessToken());
    };
    window.addEventListener('google-token-changed', handleTokenChange);
    return () => window.removeEventListener('google-token-changed', handleTokenChange);
  }, []);

  // Fetch functions for active service changes
  useEffect(() => {
    if (token) {
      setErrorMsg(null);
      fetchActiveServiceData();
    }
  }, [activeService, token, selectedTaskListId]);

  const fetchActiveServiceData = async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (activeService === 'drive') {
        await handleFetchDriveFiles();
      } else if (activeService === 'gmail') {
        await handleFetchGmailMessages();
      } else if (activeService === 'tasks') {
        await handleFetchTaskLists();
      } else if (activeService === 'chat') {
        await handleFetchChatSpaces();
      } else if (activeService === 'forms') {
        await handleFetchForms();
      } else if (activeService === 'classroom') {
        await handleFetchCourses();
      }
    } catch (err: any) {
      console.error(`Error loading service ${activeService}:`, err);
      setErrorMsg(`Failed to query Google ${activeService} API. Please check your credentials or active scopes. Detailed error: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Google Drive Handlers
  const handleFetchDriveFiles = async () => {
    const qParam = driveSearch ? `name contains '${driveSearch}'` : '';
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=8&fields=files(id,name,mimeType,modifiedTime,webViewLink)&q=${encodeURIComponent(qParam)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const data = await res.json();
    setDriveFiles(data.files || []);
  };

  const handleCreateTextFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return alert('Please enter a file name.');
    
    // Prompt confirmation as per Workspace Mutate design rules
    if (!window.confirm(`Create file "${uploadFileName}.txt" inside your Google Drive?`)) return;

    setIsUploading(true);
    try {
      const metadata = {
        name: `${uploadFileName}.txt`,
        mimeType: 'text/plain'
      };

      const fileData = new Blob([uploadFileContent], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', fileData);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error(await res.text() || res.statusText);
      
      alert('🎉 Text file created successfully inside your Drive!');
      setUploadFileName('');
      setUploadFileContent('');
      handleFetchDriveFiles();
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Gmail Handlers
  const handleFetchGmailMessages = async () => {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const data = await res.json();
    
    if (data.messages && data.messages.length > 0) {
      const detailedMessages = await Promise.all(
        data.messages.map(async (msg: any) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!detailRes.ok) return { id: msg.id, threadId: msg.threadId };
          const details = await detailRes.json();
          
          const subject = details.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
          const from = details.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Anonymous Sender';
          const date = details.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
          
          return {
            id: msg.id,
            threadId: msg.threadId,
            snippet: details.snippet,
            subject,
            from,
            date
          };
        })
      );
      setEmails(detailedMessages);
    } else {
      setEmails([]);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailRecipient.trim() || !gmailSubject.trim() || !gmailBody.trim()) {
      return alert('Please specify all email inputs.');
    }

    // Prompt confirmation as per Workspace Mutate rules
    if (!window.confirm(`Are you sure you want to send this email on your behalf to: ${gmailRecipient}?`)) {
      return;
    }

    setIsSendingEmail(true);
    try {
      const emailLines = [
        `To: ${gmailRecipient.trim()}`,
        `Subject: ${gmailSubject.trim()}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        gmailBody
      ];
      
      const rawEmail = btoa(unescape(encodeURIComponent(emailLines.join('\r\n'))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawEmail })
      });

      if (!res.ok) throw new Error(await res.text() || res.statusText);

      alert(`📨 Email sent successfully to: ${gmailRecipient}!`);
      setGmailRecipient('');
      setGmailSubject('');
      setGmailBody('');
      handleFetchGmailMessages();
    } catch (err: any) {
      console.error(err);
      alert(`Gmail Dispatch Fail: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 3. Meet Scheduler
  const handleCreateMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCreatedMeetLink(null);

    try {
      // Create a Google Calendar meeting event. This automatically injects Google Meet URL and returns web links.
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 Hour later

      const eventBody = {
        summary: meetTitle,
        description: 'Auto-scheduled meeting space created via Financial Workspace Suite.',
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `meet_${Math.random().toString(36).substring(2, 9)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      });

      if (!res.ok) throw new Error(await res.text() || res.statusText);
      const data = await res.json();

      const meetUrl = data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;
      if (meetUrl) {
        setCreatedMeetLink(meetUrl);
        alert('🎉 Google Meet space created successfully! Click Join link to start.');
      } else {
        throw new Error('Calender connected but failed to generate Hangout Meet. Google Admin configuration might restrict dynamic conference creation.');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Meet Creation Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Google Tasks Handlers
  const handleFetchTaskLists = async () => {
    const res = await fetch('https://www.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const data = await res.json();
    setTaskLists(data.items || []);

    if (data.items && data.items.length > 0) {
      const activeListId = selectedTaskListId || data.items[0].id;
      if (!selectedTaskListId) {
        setSelectedTaskListId(activeListId);
      }
      await handleFetchTasks(activeListId);
    }
  };

  const handleFetchTasks = async (listId: string) => {
    const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/${listId}/tasks?maxResults=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setTasks(data.items || []);
    }
  };

  const handleCreateGoogleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedTaskListId) return alert('Enter a task title first.');

    setIsLoading(true);
    try {
      const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          notes: newTaskNotes.trim()
        })
      });

      if (!res.ok) throw new Error(await res.text() || res.statusText);
      
      alert('✅ Task added inside Google Tasks!');
      setNewTaskTitle('');
      setNewTaskNotes('');
      await handleFetchTasks(selectedTaskListId);
    } catch (err: any) {
      console.error(err);
      alert(`Task add fail: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteGoogleTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Mark Google Task "${title}" as Completed?`)) return;

    setIsLoading(true);
    try {
      // To complete a task we update its status keyword
      const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed'
        })
      });

      if (!res.ok) throw new Error(await res.text() || res.statusText);
      
      alert('🌟 Google Task marked completed successfully.');
      await handleFetchTasks(selectedTaskListId);
    } catch (err: any) {
      console.error(err);
      alert(`Complete failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Google Chat Handlers
  const handleFetchChatSpaces = async () => {
    // Requires billing/organization, safe list using API
    const res = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const data = await res.json();
    setChatSpaces(data.spaces || []);
    if (data.spaces && data.spaces.length > 0 && !selectedSpaceName) {
      setSelectedSpaceName(data.spaces[0].name);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedSpaceName) return;

    if (!window.confirm('Post this message into Google Chat Room?')) return;

    setIsLoading(true);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpaceName}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: chatMessage.trim() })
      });

      if (!res.ok) throw new Error(await res.text() || res.statusText);
      
      alert('💬 Message posted successfully inside Google Chat room!');
      setChatMessage('');
    } catch (err: any) {
      console.error(err);
      alert(`Chat Post error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Google Forms Handlers
  const handleFetchForms = async () => {
    // Search forms saved inside user's Google Drive storage container
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=10&q=${encodeURIComponent("mimeType = 'application/vnd.google-apps.form'")}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const data = await res.json();
    setFormsList(data.files || []);
  };

  const handleCreateNewForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;

    if (!window.confirm(`Create a new Google Form titled "${newFormTitle}" in Drive storage?`)) return;

    setIsLoading(true);
    try {
      // Create is issued via Form document creator or Drive metadata copy
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFormTitle.trim(),
          mimeType: 'application/vnd.google-apps.form'
        })
      });

      if (!res.ok) throw new Error(await res.text() || res.statusText);
      
      alert('🎉 Google Form created successfully! You can find it inside your Google Drive.');
      setNewFormTitle('New Form');
      handleFetchForms();
    } catch (err: any) {
      console.error(err);
      alert(`Form create error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Google Classroom Handlers
  const handleFetchCourses = async () => {
    const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text() || res.statusText);
    const data = await res.json();
    setCourses(data.courses || []);
  };

  // Handle manual login refresh callback
  const handleLinkNewScopes = () => {
    onNavigateToTab('settings');
  };

  return (
    <div className="space-y-3 w-[100vw] relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] py-2 px-3 sm:px-4 md:px-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <div className="flex items-center gap-1.5 md:gap-1 mb-1">
            <span className="p-1 px-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
              Workspace Hub
            </span>
            <span className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-[9px] font-bold uppercase tracking-wider">
              Google Apps Suite
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center">
            Central Workspace Suite
            <InfoTooltip text="Access secure, linked operations directly across Google Drive, Gmail, Google Meet, Google Tasks, Chat rooms, Forms, and Google Classroom courses." />
          </h2>
        </div>
        
        <button
          type="button"
          onClick={fetchActiveServiceData}
          disabled={isLoading || !token}
          className="flex items-center gap-1.5 self-start bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10.5px] uppercase tracking-wider px-1.5 py-1.5 rounded-xl text-center shadow-xs cursor-pointer active:scale-95 transition-all"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Force Sync Feed
        </button>
      </div>

      {!token ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-2 max-w-xl mx-auto font-sans shadow-xs">
          <AlertCircle size={36} className="text-amber-500 mx-auto" />
          <h3 className="text-sm font-extrabold text-amber-900 uppercase tracking-wide">
            Authorization Credentials Required
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            Google Workspace Suite requires custom tokens to securely connect to your Drive, Gmail, and Tasks. Go to Settings and authorize any connection to instantly initialize this hub.
          </p>
          <button
            type="button"
            onClick={handleLinkNewScopes}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-extrabold text-[11px] uppercase tracking-wide p-1.5 px-2 rounded-xl cursor-pointer shadow-xs hover:from-amber-700 transition-colors"
          >
            🔌 Connect Google Services in Settings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start font-sans">
          
          {/* Left panel: Vertical Menu selection */}
          <div className="lg:col-span-3 space-y-1">
            <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 pl-1">Select Google Application</p>
            <div className="bg-white border border-slate-100 rounded-3xl p-1 shadow-xs space-y-1">
              
              <button
                type="button"
                onClick={() => setActiveService('drive')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'drive'
                    ? 'bg-blue-50 text-blue-800 font-extrabold border-l-4 border-blue-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <FolderOpen size={16} className={activeService === 'drive' ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Drive</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('gmail')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'gmail'
                    ? 'bg-red-50 text-red-800 font-extrabold border-l-4 border-red-650 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Mail size={16} className={activeService === 'gmail' ? 'text-red-500' : 'text-slate-400'} />
                  <span className="text-xs">Gmail Message</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('meet')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'meet'
                    ? 'bg-emerald-50 text-emerald-800 font-extrabold border-l-4 border-emerald-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Video size={16} className={activeService === 'meet' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Meet</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('tasks')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'tasks'
                    ? 'bg-cyan-50 text-cyan-800 font-extrabold border-l-4 border-cyan-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckSquare size={16} className={activeService === 'tasks' ? 'text-cyan-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Tasks</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('chat')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'chat'
                    ? 'bg-indigo-50 text-indigo-800 font-extrabold border-l-4 border-indigo-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <MessageSquare size={16} className={activeService === 'chat' ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Chat</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('forms')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'forms'
                    ? 'bg-purple-50 text-purple-800 font-extrabold border-l-4 border-purple-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <FileText size={16} className={activeService === 'forms' ? 'text-purple-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Forms</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('classroom')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'classroom'
                    ? 'bg-amber-50 text-amber-800 font-extrabold border-l-4 border-amber-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <GraduationCap size={16} className={activeService === 'classroom' ? 'text-amber-650' : 'text-slate-400'} />
                  <span className="text-xs">Google Classroom</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('docs')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'docs'
                    ? 'bg-blue-50 text-blue-800 font-extrabold border-l-4 border-blue-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <FileText size={16} className={activeService === 'docs' ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Docs</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('slides')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'slides'
                    ? 'bg-yellow-50 text-yellow-800 font-extrabold border-l-4 border-yellow-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Presentation size={16} className={activeService === 'slides' ? 'text-yellow-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Slides</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

              <button
                type="button"
                onClick={() => setActiveService('picker')}
                className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-all ${
                  activeService === 'picker'
                    ? 'bg-slate-100 text-slate-800 font-extrabold border-l-4 border-slate-600 pl-1.5'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <MousePointerClick size={16} className={activeService === 'picker' ? 'text-slate-600' : 'text-slate-400'} />
                  <span className="text-xs">Google Picker</span>
                </div>
                <ChevronRight size={12} className="text-slate-300" />
              </button>

            </div>
          </div>

          {/* Right panel: Active Service Workspace Area */}
          <div className="lg:col-span-9 bg-white border border-slate-100 rounded-3xl p-2 md:p-3 shadow-xs min-h-[450px]">
            {errorMsg && (
              <div className="p-1 bg-red-50 border border-red-150 text-red-800 rounded-2xl text-[11px] font-semibold mb-2 leading-relaxed">
                ⚠️ Scope Notice: {errorMsg}
              </div>
            )}

            {isLoading && (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-1">
                <RefreshCw size={24} className="animate-spin text-slate-500" />
                <p className="text-xs font-bold text-slate-500 font-sans italic">Loading workspace connection...</p>
              </div>
            )}

            {!isLoading && (
              <div className="space-y-3">
                
                {/* 1. GOOGLE DRIVE SUBPANEL */}
                {activeService === 'drive' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                          <FolderOpen className="text-blue-600" size={16} /> Google Drive File Library
                        </h3>
                        <p className="text-[10px] text-slate-400">Search and read documents directly inside Drive cloud storage.</p>
                      </div>
                      
                      {/* Search box */}
                      <div className="relative w-full sm:w-64">
                        <Search size={12} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search document name..."
                          value={driveSearch}
                          onChange={(e) => setDriveSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleFetchDriveFiles()}
                          className="w-full pl-4 pr-1 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* Left side: upload file */}
                      <form onSubmit={handleCreateTextFile} className="p-2 bg-slate-50 rounded-2xl border border-slate-150 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] uppercase font-black text-slate-500">
                          <Plus size={12} className="text-blue-500" /> Draft & Upload Document
                        </div>
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="document_title (creates .txt)"
                            value={uploadFileName}
                            onChange={(e) => setUploadFileName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs font-mono text-slate-700 outline-none"
                            required
                          />
                          <textarea
                            rows={3}
                            placeholder="Enter paragraph text document content..."
                            value={uploadFileContent}
                            onChange={(e) => setUploadFileContent(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs text-slate-700 outline-none resize-none"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isUploading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase py-1 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1"
                          >
                            {isUploading ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />} Create File in Drive
                          </button>
                        </div>
                      </form>

                      {/* Right side: files listings */}
                      <div className="space-y-1 border border-slate-100 rounded-2xl p-2 max-h-[280px] overflow-y-auto">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Cloud Files Content</span>
                        {driveFiles.length === 0 ? (
                          <div className="text-center py-5 text-slate-400 text-xs italic">No matching document objects detected.</div>
                        ) : (
                          driveFiles.map((file) => (
                            <div key={file.id} className="p-1.5 bg-white border border-slate-100 rounded-xl flex justify-between items-center gap-1 hover:border-blue-200 transition-all font-sans">
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-800 truncate">{file.name}</h5>
                                <p className="text-[8.5px] font-mono text-slate-400 mt-0.5 max-w-[200px] truncate">{file.mimeType.split('/').pop()}</p>
                              </div>
                              {file.webViewLink && (
                                <a 
                                  href={file.webViewLink} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[9.5px] font-black text-blue-600 hover:underline shrink-0 flex items-center gap-0.5"
                                >
                                  Open <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. GMAIL SUBPANEL */}
                {activeService === 'gmail' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                        <Mail className="text-red-500" size={16} /> Secure Gmail Mailbox
                      </h3>
                      <p className="text-[10px] text-slate-400">Dispatch messages and query inbox feeds using verified credentials.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* Send message form */}
                      <form onSubmit={handleSendEmail} className="p-2 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Dispatch Email</span>
                        <div className="space-y-1">
                          <input
                            type="email"
                            placeholder="Recipient email address (any_name@domain.com)"
                            value={gmailRecipient}
                            onChange={(e) => setGmailRecipient(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs text-slate-700 outline-none"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Email Subject Header"
                            value={gmailSubject}
                            onChange={(e) => setGmailSubject(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs font-bold text-slate-700 outline-none"
                            required
                          />
                          <textarea
                            rows={3}
                            placeholder="Write message text..."
                            value={gmailBody}
                            onChange={(e) => setGmailBody(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs text-slate-700 outline-none resize-none"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isSendingEmail}
                            className="w-full bg-red-650 hover:bg-red-750 text-white font-extrabold text-[10.5px] uppercase py-1 rounded-xl transition-colors flex items-center justify-center gap-1"
                          >
                            {isSendingEmail ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />} Dispatch Email Message
                          </button>
                        </div>
                      </form>

                      {/* Inbox list */}
                      <div className="border border-slate-100 rounded-2xl p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Inbox feed</span>
                        {emails.length === 0 ? (
                          <div className="text-center py-5 text-slate-400 text-xs italic">Email list is empty or restricted.</div>
                        ) : (
                          emails.map((email) => (
                            <div key={email.id} className="p-1.5 bg-slate-50/50 hover:bg-white border border-slate-100 rounded-xl space-y-1 hover:border-red-200 transition-all">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[9px] font-bold text-slate-400 line-clamp-1 max-w-[120px]">{email.from}</span>
                                <span className="text-[7.5px] font-mono text-slate-400">{email.date ? new Date(email.date).toLocaleDateString() : ''}</span>
                              </div>
                              <h5 className="text-[11px] font-extrabold text-slate-800 line-clamp-1 leading-tight">{email.subject}</h5>
                              <p className="text-[10px] text-slate-500 line-clamp-1 italic text-ellipsis leading-tight pb-0.5">{email.snippet}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. GOOGLE MEET SUBPANEL */}
                {activeService === 'meet' && (
                  <div className="space-y-2 animate-fadeIn max-w-lg mx-auto text-center py-2">
                    <div className="p-1 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 max-w-max mx-auto mb-1">
                      <Video size={24} />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest leading-relaxed">
                      Instant Google Meet Rooms Creator
                    </h3>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed font-sans">
                      Schedule a custom online audio/video space instantly. We negotiate your scope credentials with standard calendar integrations to return a valid joining link.
                    </p>

                    <form onSubmit={handleCreateMeet} className="p-2 bg-slate-50 border border-slate-150 rounded-3xl mt-2 space-y-1 text-left">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Meeting Room Topic Title</label>
                        <input
                          type="text"
                          value={meetTitle}
                          onChange={(e) => setMeetTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-xs font-bold text-slate-800 outline-none"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-emerald-650 hover:bg-emerald-750 text-white font-extrabold text-xs py-1.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        ⚡ Generate Google Meet join Room
                      </button>
                    </form>

                    {createdMeetLink && (
                      <div className="p-2 bg-emerald-50 border border-emerald-250/50 rounded-2xl mt-2 space-y-1 animate-bounce">
                        <p className="text-[10px] uppercase font-black text-emerald-800">Room is Live! 🟢</p>
                        <p className="text-xs font-bold text-slate-800 truncate select-all">{createdMeetLink}</p>
                        <a
                          href={createdMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-1 rounded-lg mt-1"
                        >
                          Join Meeting <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. GOOGLE TASKS SUBPANEL */}
                {activeService === 'tasks' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1 flex flex-col sm:flex-row justify-between items-center gap-1">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                          <CheckSquare className="text-cyan-600" size={16} /> Google Tasks synchronization
                        </h3>
                        <p className="text-[10px] text-slate-400">Map local checklists directly with official Google Tasks schedules.</p>
                      </div>

                      {/* Dropdown lists selection */}
                      {taskLists.length > 0 && (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                          <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">List:</span>
                          <select
                            value={selectedTaskListId}
                            onChange={(e) => setSelectedTaskListId(e.target.value)}
                            className="bg-white border border-slate-250 rounded-xl p-1 text-xs shrink-0 max-w-[150px] outline-none"
                          >
                            {taskLists.map((l) => (
                              <option key={l.id} value={l.id}>{l.title}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* Add new task */}
                      <form onSubmit={handleCreateGoogleTask} className="p-2 bg-slate-50 border border-slate-150 rounded-2xl space-y-1 text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Create Google Task</span>
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Enter task header summary"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs font-bold text-slate-700 outline-none"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Notes / context (optional)"
                            value={newTaskNotes}
                            onChange={(e) => setNewTaskNotes(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs text-slate-600 outline-none"
                          />
                          <button
                            type="submit"
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-[10.5px] uppercase py-1 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1"
                          >
                            <Plus size={12} /> Add to Google Tasks
                          </button>
                        </div>
                      </form>

                      {/* Active tasks listings */}
                      <div className="border border-slate-100 rounded-2xl p-2 space-y-1 max-h-[290px] overflow-y-auto">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">My Tasks List</span>
                        {tasks.length === 0 ? (
                          <div className="text-center py-5 text-slate-400 text-xs italic">All caught up! No tasks left in this list.</div>
                        ) : (
                          tasks.map((task) => (
                            <div key={task.id} className="p-1.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-1 text-left hover:border-cyan-200 transition-all font-sans">
                              <div className="min-w-0 flex-1">
                                <h5 className={`text-xs font-bold truncate leading-tight ${task.status === 'completed' ? 'line-through text-slate-400 font-medium' : 'text-slate-800'}`}>
                                  {task.title}
                                </h5>
                                {task.notes && (
                                  <p className="text-[9px] text-slate-400 truncate leading-relaxed max-w-[200px] mt-0.5">{task.notes}</p>
                                )}
                              </div>
                              {task.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteGoogleTask(task.id, task.title)}
                                  className="p-1 px-1.5 bg-slate-50 hover:bg-cyan-50 text-[9px] font-bold text-cyan-600 rounded-lg hover:text-cyan-700 cursor-pointer border border-slate-200/50 flex items-center gap-0.5 shrink-0"
                                >
                                  <Check size={10} /> Done
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. GOOGLE CHAT SUBPANEL */}
                {activeService === 'chat' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1 flex flex-col sm:flex-row justify-between items-center gap-1">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                          <MessageSquare className="text-indigo-650" size={16} /> Google Chat Rooms
                        </h3>
                        <p className="text-[10px] text-slate-400">Post messages inside security room alerts or corporate threads.</p>
                      </div>

                      {chatSpaces.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                          <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">Space:</span>
                          <select
                            value={selectedSpaceName}
                            onChange={(e) => setSelectedSpaceName(e.target.value)}
                            className="bg-white border border-slate-250 rounded-xl p-1 text-xs outline-none max-w-[150px]"
                          >
                            {chatSpaces.map((s) => (
                              <option key={s.name} value={s.name}>{s.displayName || s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="max-w-md mx-auto p-2 bg-slate-50 border border-slate-150 rounded-2xl text-left space-y-1 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Post Quick Message</span>
                      
                      <form onSubmit={handleSendChatMessage} className="space-y-1">
                        <textarea
                          rows={3}
                          placeholder={chatSpaces.length > 0 ? "Write alert message to selected space..." : "Write alert message to Chat Space..."}
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-xs text-slate-700 outline-none resize-none"
                          required
                        />

                        <button
                          type="submit"
                          className="w-full bg-indigo-650 hover:bg-indigo-750 text-white font-extrabold text-xs py-1 rounded-xl flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Send size={11} /> Send to Google Chat
                        </button>
                      </form>
                      
                      {chatSpaces.length === 0 && (
                        <p className="text-[9px] text-slate-400 text-center leading-normal mt-1">
                          Note: Google Chat spaces usually populate for Business/Enterprise accounts with workspace memberships.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. GOOGLE FORMS SUBPANEL */}
                {activeService === 'forms' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                        <FileText className="text-purple-650" size={16} /> Google Forms
                      </h3>
                      <p className="text-[10px] text-slate-400">View active surveys, question structures, and spreadsheet links.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {/* Create form */}
                      <form onSubmit={handleCreateNewForm} className="p-2 bg-slate-50 border border-slate-150 rounded-2xl space-y-1 text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Create Google Form</span>
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="Enter Form Title (e.g., Client Survey)"
                            value={newFormTitle}
                            onChange={(e) => setNewFormTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-1 text-xs font-bold outline-none"
                            required
                          />
                          <button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10.5px] uppercase py-1 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1"
                          >
                            <Plus size={11} /> Create Form inside Drive
                          </button>
                        </div>
                      </form>

                      {/* Forms listing */}
                      <div className="border border-slate-100 rounded-2xl p-2 max-h-[290px] overflow-y-auto">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">My Google Forms</span>
                        {formsList.length === 0 ? (
                          <div className="text-center py-5 text-slate-400 text-xs italic">No Forms objects found in your Drive container.</div>
                        ) : (
                          formsList.map((form) => (
                            <div key={form.id} className="p-1.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-1 text-left hover:border-purple-200 transition-all font-sans">
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-slate-800 truncate leading-tight">{form.name}</h5>
                                <p className="text-[8px] font-mono text-slate-400 mt-0.5">Updated: {new Date(form.modifiedTime).toLocaleDateString()}</p>
                              </div>
                              {form.webViewLink && (
                                <a
                                  href={form.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[9.5px] font-black text-purple-650 hover:underline flex items-center gap-0.5 shrink-0"
                                >
                                  Open <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. GOOGLE CLASSROOM SUBPANEL */}
                {activeService === 'classroom' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                        <GraduationCap className="text-amber-650" size={16} /> Google Classroom course roster
                      </h3>
                      <p className="text-[10px] text-slate-400">Manage enrolled classroom sections, coursework files, and user streams.</p>
                    </div>

                    {courses.length === 0 ? (
                      <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl space-y-1 bg-slate-50/40">
                        <GraduationCap size={30} className="text-slate-300 mx-auto" />
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">No Active Google Classes</h4>
                        <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Your account doesn't seem to have any registered classes as student or instructor. Enroll or create a class in Google Classroom to display them here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {courses.map((course) => (
                          <div key={course.id} className="p-2 bg-slate-50/40 border border-slate-150 rounded-2xl flex flex-col justify-between hover:border-amber-400 transition-all text-left space-y-1 font-sans">
                            <div className="space-y-1">
                              <span className="text-[8px] font-black bg-amber-50 text-amber-700 px-1 py-0.5 rounded uppercase tracking-wider">Course ACTIVE</span>
                              <h4 className="text-xs font-bold text-slate-800 line-clamp-1 leading-tight">{course.name}</h4>
                              {course.section && (
                                <p className="text-[9.5px] text-slate-400 font-bold">Section: {course.section}</p>
                              )}
                              {course.descriptionHeading && (
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{course.descriptionHeading}</p>
                              )}
                            </div>
                            {course.alternateLink && (
                              <a
                                href={course.alternateLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex self-start items-center gap-1.5 text-[9.5px] font-black text-amber-700 hover:underline"
                              >
                                Go to Classroom Class <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 8. GOOGLE DOCS SUBPANEL */}
                {activeService === 'docs' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                        <FileText className="text-blue-600" size={16} /> Google Docs Integration
                      </h3>
                      <p className="text-[10px] text-slate-400">Create, edit, and read dynamic Google Documents instantly.</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                      <FileText size={32} className="text-blue-500" />
                      <p className="text-xs text-slate-600 max-w-sm">
                        Use the automated report generator to quickly create a test Google Document with your credentials.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { generateSampleReportDoc } = await import('./GoogleDocsManager');
                            const docId = await generateSampleReportDoc({ message: "Hello from Central Workspace Suite!" });
                            alert(`✅ Google Doc Created! ID: ${docId}`);
                            window.open(`https://docs.google.com/document/d/${docId}/edit`, '_blank');
                          } catch (err: any) {
                            alert(`Error creating Google Doc: ${err.message}`);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] uppercase py-2 px-4 rounded-xl transition-colors"
                      >
                        Create Auto-Generated Doc
                      </button>
                    </div>
                  </div>
                )}

                {/* 9. GOOGLE SLIDES SUBPANEL */}
                {activeService === 'slides' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                        <Presentation className="text-yellow-600" size={16} /> Google Slides API
                      </h3>
                      <p className="text-[10px] text-slate-400">Create dynamic presentation decks for clients and pitches.</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                      <Presentation size={32} className="text-yellow-500" />
                      <p className="text-xs text-slate-600 max-w-sm mb-2">
                        Use the automated presentation generator to quickly create a test Google Slide deck with your credentials.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { generateSampleSlideDeck } = await import('./GoogleSlidesManager');
                            const deckId = await generateSampleSlideDeck({ title: "InvestMant Pitch Deck" });
                            alert(`✅ Google Slide Created! ID: ${deckId}`);
                            window.open(`https://docs.google.com/presentation/d/${deckId}/edit`, '_blank');
                          } catch (err: any) {
                            alert(`Error creating Google Slide: ${err.message}`);
                          }
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-extrabold text-[11px] uppercase py-2 px-4 rounded-xl transition-colors"
                      >
                        Create Auto-Generated Slide Deck
                      </button>
                    </div>
                  </div>
                )}

                {/* 10. GOOGLE PICKER SUBPANEL */}
                {activeService === 'picker' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="border-b border-slate-100 pb-1">
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-0.5">
                        <MousePointerClick className="text-slate-600" size={16} /> Google File Picker
                      </h3>
                      <p className="text-[10px] text-slate-400">Launch the official Google Picker UI to select any file from your Drive.</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                      <FolderOpen size={32} className="text-slate-500" />
                      <p className="text-xs text-slate-600 max-w-sm mb-2">
                        Select a spreadsheet, document, image, or folder from your personal Google Drive account.
                      </p>
                      <GooglePicker 
                        label="Open Official Google Picker" 
                        onSelect={(file) => {
                          alert(`You selected: ${file.name}\nMIME: ${file.mimeType}\nURL: ${file.url}`);
                        }} 
                      />
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
