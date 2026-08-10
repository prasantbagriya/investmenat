import React from 'react';
import { Mail, MapPin, Phone, MessageSquare } from 'lucide-react';

const ContactUs = () => {
  return (
    <div className="flex-1 w-full bg-slate-50 py-24 relative overflow-hidden">
      
      {/* Decorative BG elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">Contact Us</h1>
          <p className="text-slate-500 text-xl max-w-2xl mx-auto font-medium">Have questions or need support? We're here to help.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">
          
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Get in Touch</h2>
              <p className="text-slate-500 font-medium">Reach out to us directly through any of these channels.</p>
            </div>
            
            <div className="space-y-8 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex items-start gap-5 group">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-lg mb-1">Email Support</h3>
                  <p className="text-slate-500 text-sm mb-2 font-medium">For general queries and technical support.</p>
                  <a href="mailto:support@investmant.com" className="text-indigo-600 font-bold hover:text-indigo-700">support@investmant.com</a>
                </div>
              </div>

              <div className="flex items-start gap-5 group">
                <div className="p-4 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-lg mb-1">Office HQ</h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    InvestMant Inc.<br />
                    123 Wealth Avenue, Tech District<br />
                    Mumbai, Maharashtra 400001
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-5 group">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-slate-900 font-bold text-lg mb-1">Phone</h3>
                  <p className="text-slate-500 text-sm mb-2 font-medium">Mon-Fri from 9am to 6pm.</p>
                  <a href="tel:+919876543210" className="text-indigo-600 font-bold hover:text-indigo-700">+91 98765 43210</a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[2.5rem] p-10 md:p-14 shadow-[0_8px_40px_rgb(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="flex items-center gap-3 mb-8">
              <MessageSquare className="text-indigo-600" size={32} />
              <h2 className="text-3xl font-black text-slate-900">Send a message</h2>
            </div>
            
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Thanks for your message! We will get back to you soon."); }}>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="John Doe" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="john@example.com" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Subject</label>
                <input 
                  type="text" 
                  required
                  placeholder="How can we help?" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Message</label>
                <textarea 
                  required
                  rows={5} 
                  placeholder="Write your message here..." 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm font-medium resize-none"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full px-8 py-5 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-lg rounded-lg transition-colors shadow-lg hover:shadow-indigo-500/30"
              >
                Send Message
              </button>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ContactUs;
