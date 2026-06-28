import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, FileText, HelpCircle, ShieldCheck } from 'lucide-react';
import { Language } from '../types';


interface HelpLegalScreenProps {
  onBack: () => void;
  language: Language;
}

export const HelpLegalScreen: React.FC<HelpLegalScreenProps> = ({ onBack, language }) => {
  const [activeTab, setActiveTab] = useState<'help' | 'terms' | 'privacy'>('help');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const t = {
    en: {
      title: 'Help & Legal',
      helpSupport: 'Help & Support',
      terms: 'Terms & Conditions',
      privacy: 'Privacy Policy',
      faqTitle: 'Frequently Asked Questions',
      legalTerms: 'Terms of Service',
      legalPrivacy: 'Privacy Policy Document',
      faqs: [
        { q: 'How to create a new invoice?', a: 'Go to the Dashboard and tap on "Sale Bill". Select or add a customer, add items to the list, and hit "Save".' },
        { q: 'Can I use the app offline?', a: 'Yes! Our app functions completely offline. Once you connect to the internet, it will synchronize your records automatically.' },
        { q: 'How to backup my data?', a: 'Your data is securely backed up in the cloud when you are online. No manual backup is necessary.' },
        { q: 'How do I add a new item?', a: 'Go to the "Master" tab and tap "Item Master". Then click on "Add Item" to catalog new inventory.' },
        { q: 'Is my data secure?', a: 'Yes, we use industry-standard encryption practices to ensure your data stays private and secure.' },
      ],
      termsContent: 'Welcome to our application. By continuing to use this app, you agree to comply with and be bound by the following terms and conditions of use. \n\n1. The content of the pages of this app is for your general information and use only. It is subject to change without notice.\n2. Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this app for any particular purpose.\n3. Your use of any information or materials on this app is entirely at your own risk, for which we shall not be liable.',
      privacyContent: 'This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application. \n\n1. Information Collection: We may collect information about you in a variety of ways, including data you provide us directly and data we collect automatically. \n2. Use of Information: Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. \n3. Data Security: We use administrative, technical, and physical security measures to help protect your personal information.'
    },
    hi: {
      title: 'हेल्प और लीगल',
      helpSupport: 'हेल्प और सपोर्ट',
      terms: 'नियम और शर्तें',
      privacy: 'प्राइवेसी पॉलिसी',
      faqTitle: 'अक्सर पूछे जाने वाले सवाल (FAQs)',
      legalTerms: 'सेवा की शर्तें',
      legalPrivacy: 'प्राइवेसी पॉलिसी दस्तावेज़',
      faqs: [
        { q: 'नया बिल कैसे बनाएं?', a: 'डैशबोर्ड पर जाएं और "सेल बिल" पर टैप करें। ग्राहक चुनें या जोड़ें, लिस्ट में आइटम जोड़ें और "सेव" दबाएं।' },
        { q: 'क्या मैं ऐप का ऑफलाइन इस्तेमाल कर सकता हूँ?', a: 'हाँ! हमारा ऐप पूरी तरह से ऑफलाइन काम करता है। इंटरनेट से कनेक्ट होने पर यह अपने आप रिकॉर्ड सिंक कर लेगा।' },
        { q: 'अपने डेटा का बैकअप कैसे लें?', a: 'जब आप ऑनलाइन होते हैं तो आपका डेटा क्लाउड में सुरक्षित रूप से बैकअप हो जाता है। मैनुअल बैकअप की कोई आवश्यकता नहीं है।' },
        { q: 'नया आइटम कैसे जोड़ें?', a: '"मास्टर" टैब पर जाएं और "आइटम" पर टैप करें। फिर नया स्टॉक जोड़ने के लिए "नया आइटम जोड़ें" पर क्लिक करें।' },
        { q: 'क्या मेरा डेटा सुरक्षित है?', a: 'हाँ, हम यह सुनिश्चित करने के लिए उद्योग-मानक एन्क्रिप्शन प्रथाओं का उपयोग करते हैं कि आपका डेटा निजी और सुरक्षित रहे।' },
      ],
      termsContent: 'हमारे एप्लिकेशन में आपका स्वागत है। इस ऐप का उपयोग जारी रखकर, आप निम्नलिखित नियमों और शर्तों का पालन करने और उनसे बाध्य होने के लिए सहमत हैं। \n\n1. इस ऐप के पृष्ठों की सामग्री केवल आपकी सामान्य जानकारी और उपयोग के लिए है। यह बिना किसी सूचना के परिवर्तन के अधीन है।\n2. न तो हम और न ही कोई तीसरा पक्ष किसी विशेष उद्देश्य के लिए इस ऐप पर पाए गए या पेश किए गए जानकारी और सामग्रियों की सटीकता, समयबद्धता, प्रदर्शन, पूर्णता या उपयुक्तता के बारे में कोई वारंटी या गारंटी प्रदान करते हैं।\n3. इस ऐप पर किसी भी जानकारी या सामग्री का आपका उपयोग पूरी तरह से आपके अपने जोखिम पर है, जिसके लिए हम उत्तरदायी नहीं होंगे।',
      privacyContent: 'यह प्राइवेसी पॉलिसी बताती है कि जब आप हमारे एप्लिकेशन का उपयोग करते हैं तो हम आपकी जानकारी को कैसे एकत्र, उपयोग, प्रकट और सुरक्षित करते हैं। \n\n1. जानकारी संग्रह: हम विभिन्न तरीकों से आपके बारे में जानकारी एकत्र कर सकते हैं, जिसमें वह डेटा शामिल है जो आप हमें सीधे प्रदान करते हैं और वह डेटा जो हम स्वचालित रूप से एकत्र करते हैं। \n2. जानकारी का उपयोग: आपके बारे में सटीक जानकारी होने से हम आपको एक सहज, कुशल और अनुकूलित अनुभव प्रदान कर सकते हैं। \n3. डेटा सुरक्षा: हम आपकी व्यक्तिगत जानकारी की सुरक्षा में मदद करने के लिए प्रशासनिक, तकनीकी और भौतिक सुरक्षा उपायों का उपयोग करते हैं।'
    }
  };

  const labels = t[language];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm px-4 py-3 flex items-center gap-3 shrink-0 relative z-10 border-b border-gray-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95">
          <ArrowLeft size={24} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">{labels.title}</h1>
      </header>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <button 
          onClick={() => setActiveTab('help')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'help' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <HelpCircle size={18} />
          <span className="hidden sm:inline">{labels.helpSupport}</span>
          <span className="sm:hidden">Help</span>
        </button>
        <button 
          onClick={() => setActiveTab('terms')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'terms' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <FileText size={18} />
          <span className="hidden sm:inline">{labels.terms}</span>
          <span className="sm:hidden">Terms</span>
        </button>
        <button 
          onClick={() => setActiveTab('privacy')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'privacy' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <ShieldCheck size={18} />
          <span className="hidden sm:inline">{labels.privacy}</span>
          <span className="sm:hidden">Privacy</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950">
        
        {/* Help & Support (FAQ RecyclerView logic) */}
        {activeTab === 'help' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom flex flex-col gap-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{labels.faqTitle}</h2>
            {labels.faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all"
              >
                <button 
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="font-semibold text-sm md:text-base text-slate-800 dark:text-slate-100 pr-4">{faq.q}</span>
                  <div className="text-slate-400 shrink-0">
                    {expandedFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>
                {expandedFaq === index && (
                  <div className="px-5 pb-4 pt-1 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed border-t border-gray-100 dark:border-slate-800">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Terms & Conditions */}
        {activeTab === 'terms' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <div className="p-3 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{labels.legalTerms}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: April 2026</p>
                    </div>
                </div>
                <div className="text-sm md:text-base text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed space-y-4">
                    {labels.termsContent}
                </div>
            </div>
          </div>
        )}

        {/* Privacy Policy */}
        {activeTab === 'privacy' && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <div className="p-3 bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 rounded-lg">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{labels.legalPrivacy}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: April 2026</p>
                    </div>
                </div>
                <div className="text-sm md:text-base text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed space-y-4">
                    {labels.privacyContent}
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
