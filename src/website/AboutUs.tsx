import React from 'react';
import { ShieldCheck, Target, Users, Zap, Globe } from 'lucide-react';

const AboutUs = () => {
  return (
    <div className="flex-1 w-full bg-slate-50 py-24 relative overflow-hidden">
      
      {/* Decorative BG elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-bl-[100%] pointer-events-none opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-50 rounded-tr-[100%] pointer-events-none opacity-60"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
        
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-indigo-100 to-purple-100 text-indigo-600 rounded-xl mb-8 shadow-sm">
            <Users size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">About InvestMant</h1>
          <p className="text-slate-500 text-xl max-w-2xl mx-auto font-medium leading-relaxed">Building the future of personal wealth intelligence for retail investors.</p>
        </div>

        <div className="space-y-10 text-slate-600 leading-relaxed font-medium">
          
          <section className="bg-white p-10 md:p-14 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] transition-all duration-300">
            <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-4">
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Target size={28} /></span> 
              Our Mission
            </h2>
            <p className="mb-5 text-lg">
              InvestMant was built with a simple mission: to democratize financial intelligence. We believe that everyone should have access to professional-grade tools to track their portfolio, understand market trends, and forecast their financial future without having to pay exorbitant subscription fees or give away their data to third parties.
            </p>
            <p className="text-lg">
              We designed this platform to be your unified financial command center, bridging the gap between everyday expense tracking and complex stock market investments.
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] transition-all duration-300">
              <h2 className="text-2xl font-black text-slate-900 mb-5 flex items-center gap-3">
                <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><ShieldCheck size={24} /></span> 
                Privacy First
              </h2>
              <p>
                Unlike other platforms that sell your financial data, InvestMant is built on a privacy-first architecture. Your data is stored securely in the cloud and synced only to your authenticated devices. 
              </p>
            </section>

            <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] transition-all duration-300">
              <h2 className="text-2xl font-black text-slate-900 mb-5 flex items-center gap-3">
                <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Zap size={24} /></span> 
                The Platform
              </h2>
              <p className="mb-4">
                InvestMant supports a wide variety of asset classes directly integrated:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-500 marker:text-indigo-400">
                <li>Direct Equity & Stocks (NSE/BSE)</li>
                <li>Mutual Funds & SIPs</li>
                <li>Fixed Deposits (FDs)</li>
                <li>Real Estate & Crypto</li>
              </ul>
            </section>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AboutUs;
