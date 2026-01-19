
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileUp, ListChecks, PlusCircle, LogOut, Info, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { NGO_CONFIG, MOCK_RECORDS } from './constants';
import { SubsidyRecord, AppTab } from './types';
import { parseExcelFile } from './services/excelService';
import { getFinancialInsights } from './services/geminiService';

// --- Components ---

const Sidebar = ({ activeTab, onLogout }: { activeTab: string, onLogout: () => void }) => {
  const menuItems = [
    { id: AppTab.DASHBOARD, label: '儀表板', icon: LayoutDashboard },
    { id: AppTab.IMPORT, label: '批次匯入', icon: FileUp },
    { id: AppTab.MANUAL, label: '單筆補登', icon: PlusCircle },
    { id: AppTab.RECORDS, label: '紀錄查詢', icon: ListChecks },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="bg-indigo-500 p-1.5 rounded-lg text-white">NGO</span>
          核銷系統
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">補助驗證系統 v4.8</p>
      </div>
      
      <nav className="flex-1 mt-6 px-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={`/${item.id}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
        >
          <LogOut size={20} />
          <span className="font-medium">登出系統</span>
        </button>
      </div>
    </div>
  );
};

const Dashboard = ({ records }: { records: SubsidyRecord[] }) => {
  const totalAmount = useMemo(() => records.reduce((sum, r) => sum + r.amount, 0), [records]);
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  const stats = useMemo(() => {
    const clients = new Set(records.map(r => r.clientName)).size;
    const sources = new Set(records.map(r => r.source)).size;
    return { clients, sources };
  }, [records]);

  const generateAIInsight = async () => {
    if (records.length === 0) return;
    setLoadingInsight(true);
    const result = await getFinancialInsights(records);
    setInsight(result);
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">總核銷金額</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">${totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">累計服務個案</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{stats.clients}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 text-sm font-medium">經費來源數量</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{stats.sources}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={20} />
            AI 財務分析報告
          </h2>
          <button 
            onClick={generateAIInsight}
            disabled={loadingInsight || records.length === 0}
            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-medium hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {loadingInsight ? '分析中...' : '重新生成分析'}
          </button>
        </div>
        
        {loadingInsight ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="animate-spin text-indigo-500 mb-2" />
            <p className="text-sm text-slate-500">Gemini 正在分析您的數據...</p>
          </div>
        ) : insight ? (
          <div className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
            {insight}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm italic">
            點擊「重新生成分析」以獲取當前紀錄的 AI 財務洞察。
          </div>
        )}
      </div>
    </div>
  );
};

const ImportTab = ({ onImport }: { onImport: (newRecords: SubsidyRecord[]) => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [region, setRegion] = useState(NGO_CONFIG.regions[0]);
  const [worker, setWorker] = useState(NGO_CONFIG.workers[0]);
  const [month, setMonth] = useState('2025-01');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SubsidyRecord[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const results = await parseExcelFile(file, { region, worker, month });
      setPreview(results);
    } catch (err: any) {
      alert("解析檔案失敗: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const confirmImport = () => {
    onImport(preview);
    setPreview([]);
    setFile(null);
    alert("匯入成功！");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold">會計撥款名冊匯入</h2>
        <p className="text-slate-500 text-sm">請上傳 Excel 檔案（.xls, .xlsx）進行自動解析。</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">所屬區域</label>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {NGO_CONFIG.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">操作人員</label>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            value={worker}
            onChange={(e) => setWorker(e.target.value)}
          >
            {NGO_CONFIG.workers.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">撥款月份</label>
          <input 
            type="month" 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-all">
          <input 
            type="file" 
            id="excel-upload" 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange}
          />
          <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
            <FileUp size={48} className="text-slate-400 mb-4" />
            <p className="text-slate-700 font-medium">{file ? file.name : '點擊或拖曳選擇 Excel 檔案'}</p>
            <p className="text-slate-400 text-sm mt-1">支援標準核銷格式（含 .xls）</p>
          </label>
        </div>

        {file && !preview.length && (
          <button 
            onClick={processFile}
            disabled={loading}
            className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? '分析 Excel 結構中...' : '開始解析檔案'}
          </button>
        )}
      </div>

      {preview.length > 0 && (
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" />
              解析結果（共 {preview.length} 筆）
            </h3>
            <button 
              onClick={confirmImport}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200"
            >
              確認並儲存至資料庫
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 text-left">個案</th>
                  <th className="px-4 py-3 text-left">項目</th>
                  <th className="px-4 py-3 text-left">經費來源</th>
                  <th className="px-4 py-3 text-right">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{r.clientName}</td>
                    <td className="px-4 py-3 text-slate-500">{r.item}</td>
                    <td className="px-4 py-3 text-indigo-600 font-medium">{r.source}</td>
                    <td className="px-4 py-3 text-right font-bold">${r.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="p-3 text-center text-xs text-slate-400">... 以及另外 {preview.length - 10} 筆資料</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ManualEntry = ({ onAdd }: { onAdd: (record: SubsidyRecord) => void }) => {
  const [formData, setFormData] = useState({
    clientName: NGO_CONFIG.clients[0],
    item: NGO_CONFIG.items[0],
    amount: 0,
    source: NGO_CONFIG.sources[0],
    remarks: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) return alert("請輸入有效的金額");
    
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      submitTime: new Date().toLocaleString(),
      region: '手動補登',
      worker: '當前使用者',
      month: new Date().toISOString().slice(0, 7),
      ...formData
    });

    setFormData({
      clientName: NGO_CONFIG.clients[0],
      item: NGO_CONFIG.items[0],
      amount: 0,
      source: NGO_CONFIG.sources[0],
      remarks: ''
    });

    alert("資料已成功補登！");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-2xl">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold">單筆手動補登</h2>
        <p className="text-slate-500 text-sm">用於個別資料修正或延遲入帳的補充。</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">個案姓名</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
            >
              {NGO_CONFIG.clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">補助項目</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.item}
              onChange={(e) => setFormData({...formData, item: e.target.value})}
            >
              {NGO_CONFIG.items.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">金額 ($)</label>
            <input 
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">經費來源</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.source}
              onChange={(e) => setFormData({...formData, source: e.target.value})}
            >
              {NGO_CONFIG.sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">備註</label>
          <textarea 
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            placeholder="補充說明..."
            value={formData.remarks}
            onChange={(e) => setFormData({...formData, remarks: e.target.value})}
          />
        </div>
        <button 
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4"
        >
          儲存紀錄
        </button>
      </form>
    </div>
  );
};

const RecordsTable = ({ records }: { records: SubsidyRecord[] }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">歷史核銷紀錄</h2>
          <p className="text-slate-500 text-sm">所有已驗證並存入資料庫的補助紀錄。</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4 text-left">提交時間</th>
              <th className="px-6 py-4 text-left">個案姓名</th>
              <th className="px-6 py-4 text-left">操作社工</th>
              <th className="px-6 py-4 text-left">補助項目</th>
              <th className="px-6 py-4 text-left">經費來源</th>
              <th className="px-6 py-4 text-right">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">目前尚無資料。</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{r.submitTime}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{r.clientName}</td>
                  <td className="px-6 py-4 text-slate-500">{r.worker}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] uppercase font-bold text-slate-600">{r.item}</span>
                  </td>
                  <td className="px-6 py-4 text-indigo-600 font-medium">{r.source}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">${r.amount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === '2025ngo') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-900">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-block bg-indigo-600 p-4 rounded-3xl text-white mb-4">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold">NGO 補助核銷系統</h1>
          <p className="text-slate-500">安全存取您的核銷管理平台</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">系統通行碼</label>
            <input 
              type="password"
              placeholder="請輸入密碼"
              className={`w-full px-4 py-4 rounded-2xl bg-slate-50 border focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-center text-lg tracking-[1em] ${
                error ? 'border-red-500' : 'border-slate-200'
              }`}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <p className="mt-4 text-center text-xs text-slate-400">示範用密碼：2025ngo</p>
          </div>
          <button 
            type="submit"
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl"
          >
            登入系統
          </button>
        </form>
        
        <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1"><Info size={14} /> 加密連線</span>
          <span className="flex items-center gap-1"><AlertTriangle size={14} /> 僅限內部使用</span>
        </div>
      </div>
    </div>
  );
};

// --- Main App Logic ---

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [records, setRecords] = useState<SubsidyRecord[]>(MOCK_RECORDS);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);

  useEffect(() => {
    const saved = localStorage.getItem('ngo_auth');
    if (saved === 'true') setIsLoggedIn(true);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('ngo_auth', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('ngo_auth');
  };

  const addRecords = (newRecords: SubsidyRecord[]) => {
    setRecords(prev => [...newRecords, ...prev]);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar activeTab={activeTab} onLogout={handleLogout} />
        
        <main className="flex-1 ml-64 p-8">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 capitalize">
                {activeTab === 'dashboard' ? '儀表板' : 
                 activeTab === 'import' ? '批次匯入' : 
                 activeTab === 'manual' ? '單筆補登' : '紀錄查詢'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">連線狀態：正常</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">管理者模式</p>
                <p className="text-xs text-slate-400">上次登入: 今天 09:15</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold border-2 border-white shadow-sm">
                NGO
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/dashboard" element={<><NavWatcher setActive={setActiveTab} tab={AppTab.DASHBOARD} /><Dashboard records={records} /></>} />
            <Route path="/import" element={<><NavWatcher setActive={setActiveTab} tab={AppTab.IMPORT} /><ImportTab onImport={addRecords} /></>} />
            <Route path="/manual" element={<><NavWatcher setActive={setActiveTab} tab={AppTab.MANUAL} /><ManualEntry onAdd={(r) => addRecords([r])} /></>} />
            <Route path="/records" element={<><NavWatcher setActive={setActiveTab} tab={AppTab.RECORDS} /><RecordsTable records={records} /></>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

// Utility to update active tab based on route
const NavWatcher = ({ setActive, tab }: { setActive: (t: AppTab) => void, tab: AppTab }) => {
  useEffect(() => {
    setActive(tab);
  }, [setActive, tab]);
  return null;
};

export default App;
