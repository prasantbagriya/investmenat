const fs = require('fs');
let c = fs.readFileSync('src/components/WorkspaceSuite.tsx', 'utf8');

function injectButton(headerStr) {
  return headerStr + ' <button type="button" onClick={() => setShowCreateUI(!showCreateUI)} className="ml-3 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-bold transition-colors">{showCreateUI ? "Hide Form" : "+ Create"}</button>';
}

// Drive
c = c.replace('<FolderOpen className="text-blue-600" size={16} /> Google Drive File Library', injectButton('<FolderOpen className="text-blue-600" size={16} /> Google Drive File Library'));
c = c.replace('<form onSubmit={handleCreateTextFile} className="p-2 bg-slate-50 rounded-lg border border-slate-150 space-y-1">', '{showCreateUI && ( <form onSubmit={handleCreateTextFile} className="p-2 bg-slate-50 rounded-lg border border-slate-150 space-y-1">');
c = c.replace('</button>\n                        </div>\n                      </form>', '</button>\n                        </div>\n                      </form>\n                      )}');

// Gmail
c = c.replace('<Mail className="text-red-500" size={16} /> Secure Gmail Mailbox', injectButton('<Mail className="text-red-500" size={16} /> Secure Gmail Mailbox'));
c = c.replace('<form onSubmit={handleSendEmail} className="p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-1">', '{showCreateUI && ( <form onSubmit={handleSendEmail} className="p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-1">');
c = c.replace('</button>\n                        </div>\n                      </form>', '</button>\n                        </div>\n                      </form>\n                      )}');

// Tasks
c = c.replace('<CheckSquare className="text-cyan-600" size={16} /> Google Tasks synchronization', injectButton('<CheckSquare className="text-cyan-600" size={16} /> Google Tasks synchronization'));
c = c.replace('<form onSubmit={handleCreateGoogleTask} className="p-2 bg-slate-50 rounded-lg border border-slate-150 space-y-1 mb-2">', '{showCreateUI && ( <form onSubmit={handleCreateGoogleTask} className="p-2 bg-slate-50 rounded-lg border border-slate-150 space-y-1 mb-2">');
c = c.replace('</button>\n                          </div>\n                        </form>', '</button>\n                          </div>\n                        </form>\n                        )}');

// Chat
c = c.replace('<MessageSquare className="text-indigo-650" size={16} /> Google Chat Rooms', injectButton('<MessageSquare className="text-indigo-650" size={16} /> Google Chat Rooms'));
c = c.replace('<form onSubmit={handleSendChatMessage} className="p-2 bg-slate-50 rounded-lg border border-slate-150 space-y-1">', '{showCreateUI && ( <form onSubmit={handleSendChatMessage} className="p-2 bg-slate-50 rounded-lg border border-slate-150 space-y-1">');
c = c.replace('</button>\n                        </form>', '</button>\n                        </form>\n                        )}');

// Forms
c = c.replace('<FileText className="text-purple-650" size={16} /> Google Forms', injectButton('<FileText className="text-purple-650" size={16} /> Google Forms'));
c = c.replace('<form onSubmit={handleCreateNewForm} className="p-2 bg-slate-50 border border-slate-150 rounded-lg space-y-1">', '{showCreateUI && ( <form onSubmit={handleCreateNewForm} className="p-2 bg-slate-50 border border-slate-150 rounded-lg space-y-1">');
c = c.replace('</button>\n                        </div>\n                      </form>', '</button>\n                        </div>\n                      </form>\n                      )}');

// Docs
c = c.replace('<FileText className="text-blue-600" size={16} /> Google Docs Integration', injectButton('<FileText className="text-blue-600" size={16} /> Google Docs Integration'));
c = c.replace('<form onSubmit={async (e) => {', '{showCreateUI && ( <form onSubmit={async (e) => {');
// we can replace the first </form> after that line. We'll do it manually if needed, but let's try.
c = c.replace('</button>\n                        </div>\n                      </form>', '</button>\n                        </div>\n                      </form>\n                      )}');

// Slides
c = c.replace('<Presentation className="text-yellow-600" size={16} /> Google Slides API', injectButton('<Presentation className="text-yellow-600" size={16} /> Google Slides API'));
// In Slides, it is similar. Let's see: `<form onSubmit={async (e) => {`
// Actually, I'll just change the layout. 

c = c.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-2"/g, 'className={`grid grid-cols-1 ${showCreateUI ? "md:grid-cols-2" : ""} gap-2`}');

fs.writeFileSync('src/components/WorkspaceSuite.tsx', c);
console.log('Update script completed.');
