import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Users, CalendarCheck, FileBarChart, Plus, Trash2, Edit2, 
  X, Save, IndianRupee, Search, Calendar, CheckCircle2, AlertCircle, 
  Share2, Clipboard, ChevronLeft, ChevronRight, Check, Sparkles, MessageSquare, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Worker, Attendance, Language } from '../../core/types/';
import { billingService } from '../../services/billingService';

interface AttendanceScreenProps {
  onBack: () => void;
  language: Language;
  initialDate?: Date;
}

// Translations dictionary
const localization = {
  en: {
    title: 'Worker Attendance',
    dailyEntry: 'Daily Entry',
    report: 'Salary & Report',
    workers: 'Workers List',
    addWorker: 'Add Worker',
    editWorker: 'Edit Worker',
    searchWorker: 'Search worker...',
    workerName: 'Worker Name',
    mobileNo: 'Mobile Number',
    dailyWage: 'Daily Wage (₹)',
    saveWorker: 'Save Worker',
    deleteWorker: 'Delete Worker',
    deleteConfirmTitle: 'Delete Worker?',
    deleteConfirmDesc: 'Are you sure you want to delete Ramesh? This will completely wipe all of their historical attendance records from this device.',
    cancel: 'Cancel',
    delete: 'Delete',
    wagePerDay: 'Wage: ₹{{w}}/day',
    noWorkers: 'No workers registered yet.',
    addOne: 'Register your first worker to start managing attendance.',
    attendanceDate: 'Attendance Date',
    markedCount: 'Attendance Registered: {{marked}}/{{total}}',
    present: 'Present',
    absent: 'Absent',
    halfDay: 'Half Day',
    status: 'Status',
    totalSalary: 'Calculated Salary',
    totalDays: 'Days Worked',
    exportWhatsApp: 'Share on WhatsApp',
    exportClipboard: 'Copy Report',
    allStaffExport: 'Copy Full Payroll',
    attendanceReport: 'Attendance Report',
    allMarked: 'All records marked for today!',
    notMarked: 'Attendance Not Marked',
    summary: 'Daily Attendance Stats',
    savedMsg: 'Worker profile saved successfully!',
    deletedMsg: 'Worker deleted successfully!',
    copiedMsg: 'Staff payroll report copied to clipboard!',
    optional: 'Optional',
    selectMonth: 'Select Salary Month',
    payrollSummary: 'Staff Payroll Summary',
    noHistory: 'No attendance records found for this month.',
    workerDetail: 'Worker Details',
    enterName: 'Enter employee full name',
    enterWage: 'Daily payout rate',
    unmarked: 'Unmarked',
    workSummary: 'Work Summary'
  },
  hi: {
    title: 'कर्मचारी उपस्थिति और वेतन',
    dailyEntry: 'दैनिक हाजिरी',
    report: 'वेतन और रिपोर्ट',
    workers: 'कर्मचारी सूची',
    addWorker: 'नया कर्मचारी जोड़ें',
    editWorker: 'कर्मचारी विवरण बदलें',
    searchWorker: 'कर्मचारी खोजें...',
    workerName: 'कर्मचारी का नाम',
    mobileNo: 'मोबाइल नंबर',
    dailyWage: 'दैनिक वेतन (₹)',
    saveWorker: 'कर्मचारी सुरक्षित करें',
    deleteWorker: 'कर्मचारी हटाएं',
    deleteConfirmTitle: 'कर्मचारी हटाएं?',
    deleteConfirmDesc: 'क्या आप इस कर्मचारी को हटाना चाहते हैं? इसके बाद इनका सारा पुराना हाजिरी इतिहास स्थायी रूप से डिलीट हो जाएगा।',
    cancel: 'रद्द करें',
    delete: 'हटाएं (Delete)',
    wagePerDay: 'वेतन: ₹{{w}}/दिन',
    noWorkers: 'अभी तक कोई कर्मचारी नहीं जोड़ा गया है।',
    addOne: 'हाजिरी शुरू करने के लिए कृपया पहले एक नया कर्मचारी जोड़ें।',
    attendanceDate: 'उपस्थिति की तारीख',
    markedCount: 'हाजिरी पूरी: {{marked}}/{{total}}',
    present: 'हाजिर (Present)',
    absent: 'गैरहाजिर (Absent)',
    halfDay: 'आधा दिन (Half Day)',
    status: 'स्थिति',
    totalSalary: 'बना हुआ कुल वेतन',
    totalDays: 'कुल काम के दिन',
    exportWhatsApp: 'व्हाट्सएप पर भेजें',
    exportClipboard: 'रिपोर्ट कॉपी करें',
    allStaffExport: 'पूरा पेरोल कॉपी करें',
    attendanceReport: 'उपस्थिति रिपोर्ट',
    allMarked: 'आज की सभी कर्मचारियों की हाजिरी लग गई!',
    notMarked: 'हाजिरी दर्ज नहीं है',
    summary: 'आज का हाजिरी सारांश',
    savedMsg: 'कर्मचारी प्रोफ़ाइल सुरक्षित हो गई!',
    deletedMsg: 'कर्मचारी सफलतापूर्वक हटा दिया गया है!',
    copiedMsg: 'कर्मचारियों की पूरी वेतन रिपोर्ट कॉपी हो गई है!',
    optional: 'वैकल्पिक',
    selectMonth: 'वेतन महीना चुनें',
    payrollSummary: 'स्टाफ पेरोल रिपोर्ट',
    noHistory: 'इस महीने में कोई हाजिरी रिकॉर्ड नहीं मिला।',
    workerDetail: 'कर्मचारी की जानकारी',
    enterName: 'कर्मचारी का पूरा नाम दर्ज करें',
    enterWage: 'प्रतिदिन का वेतन दर दर्ज करें',
    unmarked: 'बाकी',
    workSummary: 'काम का संक्षिप्त विवरण'
  }
};

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ onBack, language, initialDate }) => {
  const isHi = language === 'hi';
  const t = isHi ? localization.hi : localization.en;

  const [activeTab, setActiveTab] = useState<'daily' | 'workers' | 'report'>('daily');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  // Daily Tab State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return (initialDate || new Date()).toLocalDateString();
  });
  const [attendanceMap, setAttendanceMap] = useState<{[workerId: string]: 'Present' | 'Absent' | 'Half-Day' | undefined}>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Worker Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workerForm, setWorkerForm] = useState({ name: '', mobile: '', dailyWage: 0 });

  // Custom Delete Confirm Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Report Tab State
  const [reportMonth, setReportMonth] = useState(() => {
    return new Date().toLocalDateString().slice(0, 7); // YYYY-MM
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportSearchQuery, setReportSearchQuery] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') {
      loadAttendanceForDate(selectedDate);
    } else if (activeTab === 'report') {
      generateReport();
    }
  }, [activeTab, selectedDate, reportMonth, workers]);

  const loadWorkers = async () => {
    setLoading(true);
    const data = await billingService.getAllWorkers();
    setWorkers(data || []);
    setLoading(false);
  };

  const loadAttendanceForDate = async (date: string) => {
    const data = await billingService.getAttendanceByDate(date);
    const map: {[key: string]: 'Present' | 'Absent' | 'Half-Day'} = {};
    if (data) {
      data.forEach(a => {
        map[a.workerId] = a.status;
      });
    }
    setAttendanceMap(map);
  };

  const handleMarkAttendance = async (workerId: string, status: 'Present' | 'Absent' | 'Half-Day') => {
    const current = attendanceMap[workerId];
    // If clicking already selected status, toggle it off/delete it? Let's just set the status!
    setAttendanceMap(prev => ({ ...prev, [workerId]: status }));
    try {
      await billingService.markAttendance(workerId, selectedDate, status);
    } catch (e) {
      console.error('Failed to mark attendance', e);
    }
  };

  const generateReport = async () => {
    const [year, month] = reportMonth.split('-').map(Number);
    if (!year || !month) return;
    try {
      const attendanceList = await billingService.getAttendanceByMonth(year, month - 1);
      const list = attendanceList || [];

      const report = workers.map(worker => {
        const workerAttendance = list.filter(a => a.workerId === worker.id);
        const presentDays = workerAttendance.filter(a => a.status === 'Present').length;
        const halfDays = workerAttendance.filter(a => a.status === 'Half-Day').length;
        const absentDays = workerAttendance.filter(a => a.status === 'Absent').length;

        const totalDaysForPay = presentDays + (halfDays * 0.5);
        const totalSalary = totalDaysForPay * (worker.dailyWage || 0);

        return {
          ...worker,
          presentDays,
          halfDays,
          absentDays,
          totalDaysForPay,
          totalSalary
        };
      });
      setReportData(report);
    } catch (e) {
      console.error('Failed to generate report', e);
    }
  };

  // Safe Worker Form Submissions
  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = workerForm.name.trim();
    const cleanWage = parseFloat(workerForm.dailyWage as any) || 0;
    if (!cleanName || cleanWage <= 0) return;

    const worker: Worker = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: cleanName,
      mobile: workerForm.mobile.trim(),
      dailyWage: cleanWage
    };

    try {
      await billingService.saveWorker(worker);
      setIsModalOpen(false);
      showToast(t.savedMsg, 'success');
      loadWorkers();
    } catch (err) {
      console.error('Failed to save worker', err);
    }
  };

  const executeDeleteWorker = async (id: string) => {
    try {
      await billingService.deleteWorker(id);
      setDeleteConfirmId(null);
      showToast(t.deletedMsg, 'success');
      loadWorkers();
    } catch (err) {
      console.error('Failed to delete worker', err);
    }
  };

  const openWorkerModal = (worker?: Worker) => {
    if (worker) {
      setEditingId(worker.id);
      setWorkerForm({
        name: worker.name,
        mobile: worker.mobile || '',
        dailyWage: worker.dailyWage
      });
    } else {
      setEditingId(null);
      setWorkerForm({
        name: '',
        mobile: '',
        dailyWage: 0
      });
    }
    setIsModalOpen(true);
  };

  // Search filter computes
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => 
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.mobile && w.mobile.includes(searchQuery))
    );
  }, [workers, searchQuery]);

  const filteredReportData = useMemo(() => {
    return reportData.filter(r => 
      r.name.toLowerCase().includes(reportSearchQuery.toLowerCase())
    );
  }, [reportData, reportSearchQuery]);

  // Statistics calculation for selected date
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let half = 0;
    let unmarked = 0;

    workers.forEach(w => {
      const status = attendanceMap[w.id];
      if (status === 'Present') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'Half-Day') half++;
      else unmarked++;
    });

    const marked = workers.length - unmarked;

    return { present, absent, half, unmarked, marked, total: workers.length };
  }, [workers, attendanceMap]);

  // Copy formatting utilities
  const copyPayrollSummary = () => {
    if (reportData.length === 0) return;
    let text = `📊 *${t.payrollSummary} - ${reportMonth}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    reportData.forEach(r => {
      text += `👤 *${r.name}* (${r.mobile || 'No No.'})\n`;
      text += `   • P: ${r.presentDays} | HD: ${r.halfDays} | A: ${r.absentDays}\n`;
      text += `   • Net Paid Days: ${r.totalDaysForPay.toFixed(1)}\n`;
      text += `   • Estimated Wage: ₹${r.totalSalary.toFixed(2)}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
    });
    
    try {
      navigator.clipboard.writeText(text);
      showToast(t.copiedMsg, 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const shareWorkerReportOnWhatsApp = (r: any) => {
    const text = `📋 *${t.attendanceReport}* (${reportMonth})\n` +
      `👤 *Employee:* ${r.name}\n` +
      `📞 *Mobile:* ${r.mobile || 'N/A'}\n` +
      `💰 *Daily wage:* ₹${r.dailyWage}/day\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *Present days:* ${r.presentDays}\n` +
      `🌗 *Half days:* ${r.halfDays}\n` +
      `❌ *Absent days:* ${r.absentDays}\n` +
      `⭐ *Net paid days:* ${r.totalDaysForPay.toFixed(1)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 *Total Salary Due:* ₹${r.totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
      `🎒 Sent via EazyBilling App`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const changeDateByAmount = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toLocalDateString());
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)] relative">
      
      {/* Toast Alert overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 right-4 z-[100] pointer-events-none flex justify-center"
          >
            <div className="bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm pointer-events-auto">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-extrabold">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white p-4 pt-[max(env(safe-area-inset-top),38px)] flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack} 
            className="p-2 -ml-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 font-mono">Operations console</span>
            <h1 className="text-base font-extrabold tracking-tight">{t.title}</h1>
          </div>
        </div>

        {activeTab === 'workers' && (
          <button
            type="button"
            onClick={() => openWorkerModal()}
            className="px-3.5 py-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3px]" />
            {t.addWorker}
          </button>
        )}
      </header>

      {/* Tabs Switcher Segment */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 p-1.5 flex gap-1 shadow-2xs">
        <button 
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all relative ${
            activeTab === 'daily' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <CalendarCheck size={18} className="relative z-10" />
          <span className="relative z-10">{t.dailyEntry}</span>
          {activeTab === 'daily' && (
            <motion.div 
              layoutId="activeAttendanceTab" 
              className="absolute inset-0 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl border border-indigo-100/50 dark:border-indigo-400/10" 
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all relative ${
            activeTab === 'report' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileBarChart size={18} className="relative z-10" />
          <span className="relative z-10">{t.report}</span>
          {activeTab === 'report' && (
            <motion.div 
              layoutId="activeAttendanceTab" 
              className="absolute inset-0 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl border border-indigo-100/50 dark:border-indigo-400/10" 
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          )}
        </button>

        <button 
          onClick={() => setActiveTab('workers')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all relative ${
            activeTab === 'workers' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users size={18} className="relative z-10" />
          <span className="relative z-10">{t.workers}</span>
          {activeTab === 'workers' && (
            <motion.div 
              layoutId="activeAttendanceTab" 
              className="absolute inset-0 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl border border-indigo-100/50 dark:border-indigo-400/10" 
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          )}
        </button>
      </div>

      {/* MAIN VIEWPORT BODY */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DAILY ATTENDANCE ENTRY */}
          {activeTab === 'daily' && (
            <motion.div 
              key="daily"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-4 max-w-2xl mx-auto w-full"
            >
              {/* Datepicker Bar */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => changeDateByAmount(-1)} 
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">{t.attendanceDate}</span>
                  <div className="flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-indigo-500 rounded-lg px-2">
                    <Calendar size={13} className="text-indigo-500" />
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={e => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                        }
                      }}
                      className="font-black text-sm bg-transparent outline-none text-slate-800 dark:text-white cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => changeDateByAmount(1)} 
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Stats Panel */}
              {workers.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-emerald-950 pb-2">
                    <h4 className="text-[11px] uppercase tracking-wider font-black text-slate-700 dark:text-slate-300">{t.summary}</h4>
                    <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-black tracking-semibold">
                      {t.markedCount.replace('{{marked}}', String(stats.marked)).replace('{{total}}', String(stats.total))}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center select-none">
                    <div className="bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-xl">
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{stats.present}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-500">{isHi ? 'हाजिर' : 'Present'}</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/15 p-2 rounded-xl">
                      <p className="text-base font-black text-amber-600 dark:text-amber-400">{stats.half}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-500">{isHi ? 'हाफ डे' : 'Half Day'}</p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/15 p-2 rounded-xl">
                      <p className="text-base font-black text-rose-600 dark:text-rose-400">{stats.absent}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-500">{isHi ? 'गैरहाजिर' : 'Absent'}</p>
                    </div>
                    <div className="bg-slate-100 border dark:bg-slate-800/30 dark:border-none p-2 rounded-xl">
                      <p className="text-base font-black text-slate-600 dark:text-slate-400">{stats.unmarked}</p>
                      <p className="text-[9px] uppercase font-bold text-slate-500">{t.unmarked}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Search worker */}
              {workers.length > 0 && (
                <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 px-3.5 py-1.5 rounded-2xl shadow-2xs">
                  <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t.searchWorker}
                    className="w-full text-xs bg-transparent border-none outline-none text-slate-800 dark:text-white"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 leading-none">
                      <X size={12} className="text-slate-400" />
                    </button>
                  )}
                </div>
              )}

              {/* Employee list container */}
              <div className="space-y-3">
                {workers.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 border-dashed dark:border-slate-800/80 rounded-2xl py-12 px-6 text-center shadow-2xs animate-pulse">
                    <Users size={32} className="text-indigo-400/60 mx-auto mb-3" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">{t.noWorkers}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">{t.addOne}</p>
                    <button 
                      type="button" 
                      onClick={() => openWorkerModal()}
                      className="mt-4 inline-flex items-center gap-1 bg-indigo-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={13} className="stroke-[3px]" />
                      {t.addWorker}
                    </button>
                  </div>
                ) : filteredWorkers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-xs font-extrabold">No workers match your search.</p>
                  </div>
                ) : (
                  filteredWorkers.map(w => {
                    const status = attendanceMap[w.id];
                    const letter = w.name ? w.name.charAt(0).toUpperCase() : 'W';
                    
                    return (
                      <div 
                        key={w.id} 
                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md"
                      >
                        {/* Profile Info Details */}
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-slate-800 dark:to-slate-850 border border-indigo-200/20 rounded-2xl flex items-center justify-center font-black text-base text-indigo-600 dark:text-indigo-400 shrink-0">
                            {letter}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug">{w.name}</h3>
                              {status ? (
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  status === 'Present' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/10' :
                                  status === 'Absent' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/10' :
                                  'bg-amber-500/10 text-amber-600 border border-amber-500/10'
                                }`}>
                                  {status === 'Present' ? t.present.split(' ')[0] : 
                                   status === 'Absent' ? t.absent.split(' ')[0] : 
                                   t.halfDay.split(' ')[0]}
                                </span>
                              ) : (
                                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {t.notMarked}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3.5 mt-0.5 text-slate-500 text-[11px] font-semibold">
                              <span className="flex items-center gap-0.5"><IndianRupee size={11}/> {w.dailyWage}/day</span>
                              {w.mobile && (
                                <span className="flex items-center gap-0.5 font-mono"><Phone size={10} className="text-slate-400"/> {w.mobile}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (Present, Half-Day, Absent) */}
                        <div className="flex items-center gap-2 border-t border-slate-50 dark:border-slate-800/50 pt-2 sm:pt-0 sm:border-none">
                          <button 
                            type="button"
                            onClick={() => handleMarkAttendance(w.id, 'Present')}
                            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all border cursor-pointer ${
                              status === 'Present' 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/10' 
                                : 'bg-slate-50 dark:bg-[#111c30]/40 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                            }`}
                          >
                            P
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleMarkAttendance(w.id, 'Half-Day')}
                            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all border cursor-pointer ${
                              status === 'Half-Day' 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/10' 
                                : 'bg-slate-50 dark:bg-[#111c30]/40 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                            }`}
                          >
                            HD
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleMarkAttendance(w.id, 'Absent')}
                            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all border cursor-pointer ${
                              status === 'Absent' 
                                ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-600/10' 
                                : 'bg-slate-50 dark:bg-[#111c30]/40 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                            }`}
                          >
                            A
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: MONTHLY REPORT SUMMARY AND SALARIES */}
          {activeTab === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-4 max-w-2xl mx-auto w-full"
            >
              {/* Select Month and Global Actions */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-indigo-500 shrink-0" />
                  <div className="flex-1">
                    <label className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400 leading-none mb-1">{t.selectMonth}</label>
                    <input 
                      type="month" 
                      value={reportMonth} 
                      onChange={e => {
                        if (e.target.value) {
                          setReportMonth(e.target.value);
                        }
                      }}
                      className="font-black text-sm bg-transparent outline-none text-slate-800 dark:text-white cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {reportData.length > 0 && (
                  <button 
                    type="button"
                    onClick={copyPayrollSummary}
                    className="px-4 py-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    <Clipboard size={14} />
                    {t.allStaffExport}
                  </button>
                )}
              </div>

              {/* Attendance salary report table list */}
              {workers.length > 0 && (
                <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3.5 py-1.5 rounded-2xl shadow-2xs">
                  <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                  <input 
                    type="text"
                    value={reportSearchQuery}
                    onChange={e => setReportSearchQuery(e.target.value)}
                    placeholder={t.searchWorker}
                    className="w-full text-xs bg-transparent border-none outline-none text-slate-800 dark:text-white"
                  />
                  {reportSearchQuery && (
                    <button type="button" onClick={() => setReportSearchQuery('')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X size={12} className="text-slate-400" />
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {workers.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 border-dashed dark:border-slate-800 rounded-2xl py-12 px-6 text-center animate-pulse">
                    <Users size={32} className="text-indigo-400/60 mx-auto mb-3" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">{t.noWorkers}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.addOne}</p>
                  </div>
                ) : filteredReportData.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border rounded-2xl p-8 text-center text-slate-400">
                    <AlertCircle size={22} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold">{t.noHistory}</p>
                  </div>
                ) : (
                  filteredReportData.map(r => (
                    <div 
                      key={r.id} 
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850/60 flex flex-col gap-4.5"
                    >
                      {/* Name & Total salary billing summary */}
                      <div className="flex justify-between items-start gap-4 border-b border-slate-50 dark:border-slate-800/80 pb-3">
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 leading-snug">{r.name}</h3>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                            {t.wagePerDay.replace('{{w}}', String(r.dailyWage))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">{t.totalSalary}</p>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                            ₹{(r.totalSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Display calculations indicators */}
                      <div className="grid grid-cols-4 gap-2 text-center select-none">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2 border border-emerald-500/10 rounded-xl">
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-500">{r.presentDays}</p>
                          <p className="text-[9px] text-emerald-500 uppercase font-extrabold tracking-wider">{isHi ? 'हाजिर' : 'Present'}</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-2 border border-amber-500/10 rounded-xl">
                          <p className="text-sm font-black text-amber-600 dark:text-amber-500">{r.halfDays}</p>
                          <p className="text-[9px] text-amber-500 uppercase font-extrabold tracking-wider">{isHi ? 'हाफ डे' : 'Half Day'}</p>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/20 p-2 border border-rose-500/10 rounded-xl">
                          <p className="text-sm font-black text-rose-600 dark:text-rose-500">{r.absentDays}</p>
                          <p className="text-[9px] text-rose-500 uppercase font-extrabold tracking-wider">{isHi ? 'गैरहाजिर' : 'Absent'}</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-950/25 p-2 border border-indigo-500/10 rounded-xl">
                          <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{(r.totalDaysForPay || 0).toFixed(1)}</p>
                          <p className="text-[9px] text-indigo-500 uppercase font-extrabold tracking-wider">{isHi ? 'कुल दिन' : 'Pay Days'}</p>
                        </div>
                      </div>

                      {/* Quick Single Action button (WhatsApp/SMS Share) */}
                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button 
                          type="button"
                          onClick={() => shareWorkerReportOnWhatsApp(r)}
                          className="px-3.5 py-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 rounded-lg flex items-center gap-1.5 hover:bg-emerald-100 transition-all cursor-pointer"
                        >
                          <MessageSquare size={13} fill="currentColor" className="text-emerald-600" />
                          {t.exportWhatsApp}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: WORKERS REGISTRATION / DIRECTORY */}
          {activeTab === 'workers' && (
            <motion.div 
              key="workers"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="p-4 space-y-4 max-w-2xl mx-auto w-full"
            >
              {/* Workers list card */}
              <div className="space-y-3">
                {workers.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 border-dashed dark:border-slate-800 rounded-2xl py-12 px-6 text-center animate-pulse">
                    <Users size={32} className="text-indigo-400/60 mx-auto mb-3" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">{t.noWorkers}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.addOne}</p>
                    <button 
                      type="button" 
                      onClick={() => openWorkerModal()}
                      className="mt-4 inline-flex items-center gap-1 bg-indigo-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={13} className="stroke-[3px]" />
                      {t.addWorker}
                    </button>
                  </div>
                ) : (
                  workers.map(w => {
                    const letter = w.name ? w.name.charAt(0).toUpperCase() : 'W';
                    return (
                      <div 
                        key={w.id} 
                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-850/60 flex items-center justify-between transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-slate-800 dark:to-slate-850 rounded-2xl flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shrink-0 text-sm">
                            {letter}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug">{w.name}</h3>
                            <div className="flex items-center gap-2.5 mt-0.5 text-slate-500 text-[11px] font-semibold">
                              <span className="flex items-center gap-0.5"><IndianRupee size={11}/> {w.dailyWage}/day</span>
                              {w.mobile && (
                                <span className="flex items-center gap-0.5 font-mono"><Phone size={10} className="text-slate-400"/> {w.mobile}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex gap-1.5">
                          <button 
                            type="button"
                            onClick={() => openWorkerModal(w)} 
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setDeleteConfirmId(w.id);
                            }} 
                            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FLOAT ADD WORKER BUTTON on screen bottom right */}
      {activeTab === 'daily' && workers.length > 0 && (
        <button 
          onClick={() => openWorkerModal()}
          type="button"
          className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-90 transition-transform cursor-pointer"
        >
          <Plus size={24} className="stroke-[3px]" />
        </button>
      )}

      {/* CREATE & EDIT WORKER POPUP MODAL (Framer Motion) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-150 dark:border-slate-800"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-400" />
                  <h3 className="font-extrabold text-sm">{editingId ? t.editWorker : t.addWorker}</h3>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  <X size={18} className="text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Form Entry */}
              <form onSubmit={handleSaveWorker} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1 leading-none uppercase">{t.workerName}</label>
                  <input 
                    type="text" 
                    required 
                    value={workerForm.name} 
                    onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })} 
                    className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-50 transition-all font-semibold"
                    placeholder={t.enterName}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 leading-none uppercase">{t.mobileNo}</label>
                    <span className="text-[9px] text-slate-400 italic">({t.optional})</span>
                  </div>
                  <input 
                    type="tel" 
                    value={workerForm.mobile} 
                    onChange={e => setWorkerForm({ ...workerForm, mobile: e.target.value })} 
                    maxLength={15}
                    className="w-full text-xs font-mono border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-50 transition-all"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1 leading-none uppercase">{t.dailyWage}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">₹</span>
                    <input 
                      type="number" 
                      required 
                      step="0.01"
                      min="1"
                      value={workerForm.dailyWage || ''} 
                      onChange={e => setWorkerForm({ ...workerForm, dailyWage: e.target.value ? parseFloat(e.target.value) : 0 })} 
                      className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 pl-7 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-50 transition-all font-semibold"
                      placeholder={t.enterWage}
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-xs font-black border border-slate-150 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    {t.saveWorker}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN-APP CUSTOM DELETE CONFIRMATION MODAL (Zero Blocking popups) */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-150 dark:border-slate-800"
            >
              <div className="p-4 bg-rose-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <h3 className="font-extrabold text-sm">{t.deleteConfirmTitle}</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                  {t.deleteConfirmDesc.replace('Ramesh', workers.find(w => w.id === deleteConfirmId)?.name || 'this worker')}
                </p>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-3 text-xs font-black border border-slate-150 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => executeDeleteWorker(deleteConfirmId)}
                    className="flex-1 py-3 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
