import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Target, ShieldCheck } from 'lucide-react';

const WebsiteLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-900">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 rounded-lg shadow-lg shadow-indigo-200 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                <Target size={24} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  Invest<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Mant</span>
                </h1>
                <p className="text-xs text-slate-500 font-bold capitalize mt-0.5">
                  Wealth Intelligence
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-10">
              <Link to="/about" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">About Us</Link>
              <Link to="/contact" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Contact</Link>
              <Link to="/crypto-wallet" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Crypto Wallet</Link>

              <div className="flex items-center gap-4 border-l border-slate-200 pl-8">
                <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                  Sign In
                </Link>
                <Link to="/login" className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-all shadow-xl shadow-slate-900/20 hover:scale-105">
                  Get Started
                </Link>
              </div>
            </nav>

            {/* Mobile Nav Button */}
            <div className="md:hidden flex items-center gap-4">
              <Link to="/login" className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-md">
                Open App
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-white">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-20 pb-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">

            <div className="md:col-span-5 space-y-6">
              <Link to="/" className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl">
                  <Target size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">InvestMant</h2>
              </Link>
              <p className="text-slate-500 text-base leading-relaxed max-w-sm">
                The ultimate wealth intelligence platform. Track your portfolio, manage budgets, execute SIPs, and monitor real-time market data securely.
              </p>
            </div>

            <div className="md:col-span-3 md:col-start-7">
              <h3 className="text-slate-900 font-black mb-6 capitalize text-xs">Legal</h3>
              <ul className="space-y-4">
                <li><Link to="/privacy" className="text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/cookies" className="text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors">Cookies Policy</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-slate-900 font-black mb-6 capitalize text-xs">Company</h3>
              <ul className="space-y-4">
                <li><Link to="/about" className="text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm font-medium">
              &copy; {new Date().getFullYear()} InvestMant. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
              <ShieldCheck size={18} className="text-emerald-500" />
              AES-256 Encryption Secured
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WebsiteLayout;
