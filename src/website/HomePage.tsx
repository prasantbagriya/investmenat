import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Activity, ShieldCheck, TrendingUp, Briefcase, Zap, Smartphone, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const HomePage = () => {
  return (
    <div className="flex flex-col flex-1 w-full bg-white overflow-x-hidden relative">
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 lg:pt-40 lg:pb-48 overflow-hidden">
        {/* Soft Modern Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[100px] opacity-80"></div>
          <div className="absolute top-20 -left-20 w-[500px] h-[500px] bg-purple-100 rounded-full blur-[100px] opacity-80"></div>
          <div className="absolute top-60 left-1/3 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-[100px] opacity-80"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm"
            >
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-600 capitalize ">The Future of Wealth Management</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight leading-[1.05]"
            >
              Master Your Wealth <br className="hidden md:block" /> with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Intelligence.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium"
            >
              Your unified financial command center. Track portfolios, connect brokers, monitor live markets, and forecast your financial freedom all in one secured platform.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8"
            >
              <Link to="/login" className="w-full sm:w-auto px-10 py-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-all shadow-2xl shadow-slate-900/20 hover:shadow-slate-900/30 hover:-translate-y-1 flex items-center justify-center gap-3">
                Launch Application <Zap size={22} className="text-amber-400" />
              </Link>
              <Link to="/about" className="w-full sm:w-auto px-10 py-5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold text-lg transition-all border border-slate-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group">
                Learn More <ArrowRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-slate-50 border-y border-slate-200 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">Everything you need to grow.</h2>
            <p className="text-slate-500 text-xl font-medium">We bring together all the tools required by modern investors in one blazingly fast ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">
                <Briefcase size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Portfolio Tracking</h3>
              <p className="text-slate-500 leading-relaxed text-base font-medium">
                Track stocks, mutual funds, FDs, crypto, and real estate in a single dashboard with real-time updates and performance metrics.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-inner">
                <TrendingUp size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Market Intelligence</h3>
              <p className="text-slate-500 leading-relaxed text-base font-medium">
                Access advanced TradingView charts, options chains, global indices, and live news feeds directly from your workspace.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-inner">
                <ShieldCheck size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Secure Broker Sync</h3>
              <p className="text-slate-500 leading-relaxed text-base font-medium">
                Connect seamlessly with Upstox, Zerodha, Dhan, Angel One, and Binance to automatically import holdings without giving up your data.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 shadow-inner">
                <Activity size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Expense Management</h3>
              <p className="text-slate-500 leading-relaxed text-base font-medium">
                Log daily transactions, manage pending payments with friends, and set budget limits. Complete personal ledger system.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                <Target size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Wealth Forecaster</h3>
              <p className="text-slate-500 leading-relaxed text-base font-medium">
                Project your future net worth based on your current SIPs, FDs, and asset appreciation. Plan your retirement precisely.
              </p>
            </div>

            <div className="bg-white border border-slate-100 p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-inner">
                <Smartphone size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">PWA Native Feel</h3>
              <p className="text-slate-500 leading-relaxed text-base font-medium">
                Install as a progressive web app or use the Android APK. Works offline, syncs when online. Your data, your rules.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden bg-indigo-600">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-600/50 to-purple-800/50 mix-blend-overlay"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8 leading-tight">Ready to take control <br/>of your finances?</h2>
          <p className="text-xl md:text-2xl text-indigo-100 mb-12 font-medium max-w-2xl mx-auto">Join the smart way of tracking, forecasting, and managing your entire financial life.</p>
          <Link to="/login" className="inline-flex items-center gap-3 px-12 py-6 rounded-lg bg-white text-indigo-600 hover:bg-slate-50 font-black text-xl transition-all shadow-2xl hover:shadow-3xl hover:scale-105 transform duration-300">
            Start using InvestMant <ArrowRight size={24} className="text-indigo-600" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
