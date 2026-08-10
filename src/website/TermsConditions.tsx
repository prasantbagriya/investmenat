import React from 'react';

const TermsConditions = () => {
  return (
    <div className="flex-1 w-full bg-slate-50 py-24 relative">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-8">Terms and Conditions</h1>
        
        <div className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)]">
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-500 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              By accessing and using InvestMant, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">2. Disclaimer of Financial Advice</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              InvestMant provides financial tracking and forecasting tools for informational purposes only. We are not registered financial advisors. The content and tools provided on this platform do not constitute financial, investment, or legal advice.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">3. User Responsibilities</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and any broker API keys you integrate with the platform. You agree to use the service for lawful purposes only.
            </p>

            <h2 className="text-2xl font-black text-slate-900 mt-10 mb-4">4. Modifications to Service</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
