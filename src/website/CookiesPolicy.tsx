import React from 'react';

const CookiesPolicy = () => {
  return (
    <div className="flex-1 w-full bg-slate-50 py-24 relative">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-8">Cookies Policy</h1>
        
        <div className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)]">
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">1. What Are Cookies?</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Cookies are small text files that are stored on your computer or mobile device when you visit a website. They allow the website to recognize your device and remember if you have been to the website before.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">2. How We Use Cookies</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              InvestMant uses cookies and local storage to:
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Keep you signed in to your account securely.</li>
                <li>Store your layout preferences and theme settings.</li>
                <li>Save your API keys securely on your local device (via LocalStorage).</li>
              </ul>
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">3. Third-Party Cookies</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              We may use third-party services (such as Firebase Authentication or TradingView charting widgets) which may set their own cookies to function properly.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">4. Managing Cookies</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              You can set your browser to refuse all or some browser cookies. However, if you disable or refuse cookies, please note that some parts of the InvestMant application (especially authentication and broker integrations) may become inaccessible or not function properly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiesPolicy;
