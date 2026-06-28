import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, CalendarCheck, FileBarChart, Plus, Trash2, Edit2, X, Save, IndianRupee, Search } from 'lucide-react';
import { Worker, Attendance, Language } from '../types';
import { billingService } from '../src/services/billingService';


interface AttendanceScreenProps {
  onBack: () => void;
  language: Language;
  initialDate?: Date;
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ onBack, language, initialDate }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'workers' | 'report'>('daily');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  // Daily Tab State - Use passed date or fallback to today
  const [selectedDate, setSelectedDate] = useState((initialDate || new Date()).toLocalDateString());
  const [attendanceMap, setAttendanceMap] = useState<{[workerId: string]: string}>({});

  // Worker Tab State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workerForm, setWorkerForm] = useState({ name: '', mobile: '', dailyWage: 0 });

  // Report Tab State
  const [reportMonth, setReportMonth] = useState(new Date().toLocalDateString().slice(0, 7)); // YYYY-MM
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') loadAttendanceForDate(selectedDate);
    if (activeTab === 'report') generateReport();
  }, [activeTab, selectedDate, reportMonth, workers]);

  const loadWorkers = async () => {
    setLoading(true);
    const data = await billingService.getAllWorkers();
    setWorkers(data);
    setLoading(false);
  };

  const loadAttendanceForDate = async (date: string) => {
    const data = await billingService.getAttendanceByDate(date);
    const map: {[key: string]: string} = {};
    data.forEach(a => map[a.workerId] = a.status);
    setAttendanceMap(map);
  };

  const handleMarkAttendance = async (workerId: string, status: 'Present' | 'Absent' | 'Half-Day') => {
      // Optimistic update
      setAttendanceMap(prev => ({...prev, [workerId]: status}));
      await billingService.markAttendance(workerId, selectedDate, status);
  };

  const generateReport = async () => {
      const [year, month] = reportMonth.split('-').map(Number);
      const attendanceList = await billingService.getAttendanceByMonth(year, month - 1); // JS month 0-indexed
      
      const report = workers.map(worker => {
          const workerAttendance = attendanceList.filter(a => a.workerId === worker.id);
          const presentDays = workerAttendance.filter(a => a.status === 'Present').length;
          const halfDays = workerAttendance.filter(a => a.status === 'Half-Day').length;
          // Absent isn't usually counted for pay, but we can list it
          const absentDays = workerAttendance.filter(a => a.status === 'Absent').length;

          const totalDaysForPay = presentDays + (halfDays * 0.5);
          const totalSalary = totalDaysForPay * worker.dailyWage;

          return {
              ...worker,
              presentDays,
              halfDays,
              absentDays,
              totalSalary
          };
      });
      setReportData(report);
  };

  // --- WORKER MANAGEMENT ---
  const handleSaveWorker = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!workerForm.name || workerForm.dailyWage <= 0) return;

      const worker: Worker = {
          id: editingId || Math.random().toString(36).substr(2, 9),
          name: workerForm.name,
          mobile: workerForm.mobile,
          dailyWage: Number(workerForm.dailyWage)
      };

      await billingService.saveWorker(worker);
      setIsModalOpen(false);
      loadWorkers();
  };

  const handleDeleteWorker = async (id: string) => {
      if(confirm('Delete this worker?')) {
          await billingService.deleteWorker(id);
          loadWorkers();
      }
  };

  const openWorkerModal = (worker?: Worker) => {
      setEditingId(worker ? worker.id : null);
      setWorkerForm(worker ? { name: worker.name, mobile: worker.mobile, dailyWage: worker.dailyWage } : { name: '', mobile: '', dailyWage: 0 });
      setIsModalOpen(true);
  };

  // --- RENDER HELPERS ---

  const renderDailyTab = () => (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
             <button onClick={() => {
                 const d = new Date(selectedDate);
                 d.setDate(d.getDate() - 1);
                 setSelectedDate(d.toLocalDateString());
             }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">←</button>
             
             <div className="text-center">
                 <p className="text-xs text-slate-500 uppercase font-bold">Attendance Date</p>
                 <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    className="font-bold bg-transparent text-center outline-none text-slate-900 dark:text-white"
                 />
             </div>

             <button onClick={() => {
                 const d = new Date(selectedDate);
                 d.setDate(d.getDate() + 1);
                 setSelectedDate(d.toLocalDateString());
             }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">→</button>
          </div>

          <div className="space-y-3">
              {workers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                      <p>No workers found.</p>
                      <button onClick={() => setActiveTab('workers')} className="text-blue-500 underline mt-2">Add Workers First</button>
                  </div>
              ) : (
                  workers.map(w => {
                      const status = attendanceMap[w.id];
                      return (
                          <div key={w.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{w.name}</h3>
                                      <p className="text-xs text-slate-500">Wage: ₹{w.dailyWage}/day</p>
                                  </div>
                                  <div className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
                                      status === 'Present' ? 'bg-green-100 text-green-700 border-green-200' :
                                      status === 'Absent' ? 'bg-red-100 text-red-700 border-red-200' :
                                      status === 'Half-Day' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                      'bg-gray-100 text-gray-500 border-gray-200'
                                  }`}>
                                      {status || 'Not Marked'}
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleMarkAttendance(w.id, 'Present')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${status === 'Present' ? 'bg-green-600 text-white shadow-md ring-2 ring-green-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                  >
                                      P
                                  </button>
                                  <button 
                                    onClick={() => handleMarkAttendance(w.id, 'Half-Day')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${status === 'Half-Day' ? 'bg-yellow-500 text-white shadow-md ring-2 ring-yellow-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'}`}
                                  >
                                      HD
                                  </button>
                                  <button 
                                    onClick={() => handleMarkAttendance(w.id, 'Absent')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${status === 'Absent' ? 'bg-red-600 text-white shadow-md ring-2 ring-red-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                  >
                                      A
                                  </button>
                              </div>
                          </div>
                      );
                  })
              )}
          </div>
      </div>
  );

  const renderWorkersTab = () => (
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
          {workers.map(w => (
              <div key={w.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center">
                  <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{w.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><IndianRupee size={14}/> {w.dailyWage}/day</span>
                          <span>•</span>
                          <span>{w.mobile}</span>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => openWorkerModal(w)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-600"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteWorker(w.id)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600"><Trash2 size={18} /></button>
                  </div>
              </div>
          ))}

          <button 
            onClick={() => openWorkerModal()}
            className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 active:scale-95 transition-all"
          >
              <Plus size={24} />
          </button>
      </div>
  );

  const renderReportTab = () => (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center">
             <label className="font-bold text-slate-600 dark:text-slate-300">Select Month:</label>
             <input 
                type="month" 
                value={reportMonth} 
                onChange={e => setReportMonth(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold outline-none"
             />
          </div>

          <div className="space-y-3">
              {reportData.map(r => (
                  <div key={r.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
                      <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-3 mb-3">
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{r.name}</h3>
                          <div className="text-right">
                              <p className="text-xs text-slate-500 uppercase font-bold">Total Salary</p>
                              <p className="text-xl font-extrabold text-blue-600">₹{r.totalSalary.toLocaleString('en-IN')}</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                              <p className="text-lg font-bold text-green-700 dark:text-green-400">{r.presentDays}</p>
                              <p className="text-[10px] text-green-600 uppercase font-bold">Present</p>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
                              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{r.halfDays}</p>
                              <p className="text-[10px] text-yellow-600 uppercase font-bold">Half Day</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                              <p className="text-lg font-bold text-red-700 dark:text-red-400">{r.absentDays}</p>
                              <p className="text-[10px] text-red-600 uppercase font-bold">Absent</p>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-pink-700 text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-bold">Worker Attendance</h1>
      </header>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${activeTab === 'daily' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500'}`}
          >
              <CalendarCheck size={20} /> Daily Entry
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${activeTab === 'report' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500'}`}
          >
              <FileBarChart size={20} /> Report
          </button>
          <button 
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-3 text-sm font-bold flex flex-col items-center gap-1 border-b-2 transition-all ${activeTab === 'workers' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500'}`}
          >
              <Users size={20} /> Workers
          </button>
      </div>

      {activeTab === 'daily' && renderDailyTab()}
      {activeTab === 'report' && renderReportTab()}
      {activeTab === 'workers' && renderWorkersTab()}

      {/* Add/Edit Worker Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Worker' : 'Add New Worker'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-500" /></button>
                  </div>
                  <form onSubmit={handleSaveWorker} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Worker Name</label>
                          <input type="text" required value={workerForm.name} onChange={e => setWorkerForm({...workerForm, name: e.target.value})} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Ramesh" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile No</label>
                          <input type="tel" value={workerForm.mobile} onChange={e => setWorkerForm({...workerForm, mobile: e.target.value})} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Daily Wage (₹)</label>
                          <input type="number" required value={workerForm.dailyWage} onChange={e => setWorkerForm({...workerForm, dailyWage: Number(e.target.value)})} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 500" />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">Save Worker</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};