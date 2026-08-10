import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="flex-1 w-full bg-slate-50 py-24 relative">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-8">Privacy Policy</h1>
        
        <div className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)]">
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">1. Information We Collect</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              We collect information you provide directly to us, such as when you create or modify your account, use our services, or communicate with us. This may include your name, email address, and financial data you choose to log into the platform.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">2. How We Use Your Information</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              We use the information we collect to provide, maintain, and improve our services, such as calculating your net worth, tracking expenses, and securely syncing with your connected broker accounts.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">3. Data Security</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Your data is stored securely using Firebase. API keys for third-party brokers (like Upstox or Zerodha) are stored locally on your device where possible or encrypted securely. We do not sell your personal or financial data to third parties.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">4. Contact Us</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us via the Contact page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
