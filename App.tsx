
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, FileUp, ListChecks, PlusCircle, LogOut, 
  CheckCircle2, Loader2, Sparkles, Trash2, Eye, EyeOff, RotateCcw, 
  Settings as SettingsIcon, Download, Plus, X, CloudUpload, ExternalLink, CloudCheck, CloudOff, ListOrdered,
  ClipboardCheck, AlertCircle, Copy, Check, ShieldCheck, Lock, FileSpreadsheet, ListPlus, Search, Edit2, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { NGO_CONFIG, MOCK_RECORDS } from './constants';
import { SubsidyRecord, AppTab, NGOOptions } from './types';
import { parseExcelFile, parseSettingsExcel } from './services/excelService';
import { getFinancialInsights } from './services/geminiService';
import { syncToGoogleSheets } from './services/googleSheetsService';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- 子組件：側邊欄 ---
const Sidebar = ({ activeTab, onLogout }: { activeTab: string, onLogout: () => void }) => {
  const menuItems = [
    { id: AppTab.DASHBOARD, label: '儀表板', icon: LayoutDashboard },
    { id: AppTab.IMPORT, label: '批次匯入', icon: FileUp },
    { id: AppTab.MANUAL, label: '單筆補登', icon: PlusCircle },
    { id: AppTab.RECORDS, label: '紀錄查詢', icon: ListChecks },
    { id: AppTab.SETTINGS, label: '系統設定', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-white flex flex-col z-50">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex flex-col gap-0.5">
          <span className="bg-indigo-500 w-fit px-2 py-0.5 rounded text-[10px] text-white font-black tracking-widest uppercase">CCSA</span>
          <span className="text-lg tracking-tight">個案經濟補助</span>
        </h1>
        <p className="text-[10px] text-slate-500 mt-2 font-medium tracking-widest uppercase">Verification System v9.9</p>
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
        <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full">
          <LogOut size={20} />
          <span className="font-medium">登出系統</span>
        </button>
      </div>
    </div>
  );
};

// --- 子組件：系統設定 ---
const SettingsPage = ({ options, setOptions }: { options: NGOOptions, setOptions: React.Dispatch<React.SetStateAction<NGOOptions>> }) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showBulkPaste, setShowBulkPaste] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [editingItem, setEditingItem] = useState<{ key: keyof NGOOptions, index: number, value: string } | null>(null);

  const addItem = (key: keyof NGOOptions) => {
    const val = inputValues[key]?.trim();
    if (!val) return;
    setOptions(prev => ({ ...prev, [key]: [...new Set([...(prev[key] as string[]), val])] }));
    setInputValues(prev => ({ ...prev, [key]: '' }));
  };

  const addBulkItems = (key: keyof NGOOptions) => {
    const items = bulkText.split(/[\n,，]+/).map(s => s.trim()).filter(s => s);
    if (items.length === 0) return;
    setOptions(prev => ({ ...prev, [key]: [...new Set([...(prev[key] as string[]), ...items])] }));
    setBulkText("");
    setShowBulkPaste(null);
  };

  const removeItem = (key: keyof NGOOptions, index: number) => {
    if (window.confirm("確定要刪除此選項嗎？")) {
      setOptions(prev => ({ ...prev, [key]: (prev[key] as string[]).filter((_, i) => i !== index) }));
    }
  };

  const startEdit = (key: keyof NGOOptions, index: number, value: string) => {
    setEditingItem({ key, index, value });
  };

  const saveEdit = () => {
    if (!editingItem) return;
    const { key, index, value } = editingItem;
    const trimmedVal = value.trim();
    if (!trimmedVal) return setEditingItem(null);

    setOptions(prev => {
      const nextArr = [...(prev[key] as string[])];
      nextArr[index] = trimmedVal;
      return { ...prev, [key]: nextArr };
    });
    setEditingItem(null);
  };

  const handleSettingsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsImporting(true);
    try {
      const result = await parseSettingsExcel(e.target.files[0]);
      setOptions(prev => {
        const next = { ...prev };
        (Object.keys(result) as Array<keyof NGOOptions>).forEach(key => {
          if (Array.isArray(result[key])) {
            next[key] = [...new Set([...(next[key] as string[]), ...(result[key] as string[])])] as any;
          }
        });
        return next;
      });
      alert("設定檔解析完成，已合併不重複項目！");
    } catch (err: any) {
      alert("匯入失敗: " + err.message);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const sections = [
    { key: 'regions', label: '區域' },
    { key: 'workers', label: '社工姓名' },
    { key: 'clients', label: '個案姓名' },
    { key: 'items', label: '補助項目' },
    { key: 'sources', label: '經費來源' },
    { key: 'remarks', label: '備註常用選項' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
            <CloudUpload size={20} className="text-indigo-500" /> Google 試算表連動設定
          </h3>
          <input 
            type="text"
            placeholder="貼上 Google Apps Script URL..."
            className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            value={options.syncUrl || ''}
            onChange={(e) => setOptions(prev => ({ ...prev, syncUrl: e.target.value }))}
          />
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-lg text-white">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <FileSpreadsheet size={20} /> 快速同步對照表
          </h3>
          <p className="text-indigo-100 text-xs mb-4">匯入 Excel 可自動提取「歸屬區域」、「個案姓名」、「經費來源」等資訊。</p>
          <input type="file" id="settingsExcel" className="hidden" accept=".xlsx,.xls" onChange={handleSettingsExcel} />
          <label htmlFor="settingsExcel" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm cursor-pointer hover:bg-indigo-50 transition-all">
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <ListPlus size={16} />}
            從 Excel 批次匯入設定
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map(section => (
          <div key={section.key} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[400px] relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-900">{section.label}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Click to edit item</p>
              </div>
              <button 
                onClick={() => setShowBulkPaste(section.key)}
                className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1 font-bold shadow-sm"
              >
                <ClipboardCheck size={12} /> 批量貼上
              </button>
            </div>

            {showBulkPaste === section.key ? (
              <div className="absolute inset-0 z-30 bg-white p-6 flex flex-col animate-in slide-in-from-bottom-5">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">貼上清單 (換行分隔)</span>
                  <button onClick={() => setShowBulkPaste(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                </div>
                <textarea 
                  className="flex-1 border rounded-xl p-3 text-sm bg-slate-50 mb-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  placeholder={`例如：\n台北中心\n高雄中心`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <button 
                  onClick={() => addBulkItems(section.key as keyof NGOOptions)}
                  className="bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg"
                >
                  確認加入
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text"
                    placeholder="新增..."
                    className="flex-1 bg-slate-50 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={inputValues[section.key] || ''}
                    onChange={(e) => setInputValues({...inputValues, [section.key]: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && addItem(section.key as keyof NGOOptions)}
                  />
                  <button onClick={() => addItem(section.key as keyof NGOOptions)} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 shadow-md">
                    <Plus size={18}/>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                  {(options[section.key as keyof NGOOptions] as string[]).map((item, idx) => (
                    <div key={idx} className="group/item flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all">
                      {editingItem && editingItem.key === section.key && editingItem.index === idx ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            type="text"
                            autoFocus
                            className="flex-1 bg-white border rounded-lg px-2 py-1 text-sm outline-none ring-2 ring-indigo-500 font-bold"
                            value={editingItem.value}
                            onChange={(e) => setEditingItem({...editingItem, value: e.target.value})}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          />
                          <button onClick={saveEdit} className="text-emerald-500"><CheckCircle2 size={18}/></button>
                        </div>
                      ) : (
                        <>
                          <span 
                            onClick={() => startEdit(section.key as keyof NGOOptions, idx, item)}
                            className="flex-1 text-sm font-medium text-slate-700 cursor-text py-1 px-1 rounded hover:bg-white"
                          >
                            {item}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEdit(section.key as keyof NGOOptions, idx, item)}
                              className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="修改"
                            >
                              <Edit2 size={14}/>
                            </button>
                            <button 
                              onClick={() => removeItem(section.key as keyof NGOOptions, idx)} 
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="刪除"
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {(options[section.key as keyof NGOOptions] as string[]).length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed rounded-2xl">
                      <AlertCircle size={20}/>
                      <span className="text-[10px] font-bold">尚無任何選項</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 子組件：單筆補登 ---
const ManualEntry = ({ onAdd, options }: { onAdd: (r: SubsidyRecord) => void, options: NGOOptions }) => {
  const [formData, setFormData] = useState({ 
    region: options.regions[0] || '',
    worker: options.workers[0] || '',
    clientName: '', 
    item: options.items[0] || '', 
    amount: 0, 
    source: options.sources[0] || '', 
    remarks: '' 
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return options.clients.slice(0, 50);
    const search = clientSearch.toLowerCase();
    return options.clients.filter(c => c.toLowerCase().includes(search));
  }, [options.clients, clientSearch]);

  const selectClient = (name: string) => {
    setFormData({ ...formData, clientName: name });
    setClientSearch(name);
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName) return alert("請選擇或輸入個案姓名");
    if (formData.amount <= 0) return alert("金額必須大於 0");
    onAdd({ 
      id: generateId(), 
      submitTime: new Date().toLocaleString(), 
      month: new Date().toISOString().slice(0, 7), 
      ...formData 
    });
    alert("儲存成功！資料已暫存在本地。");
    setFormData(prev => ({ ...prev, clientName: '', amount: 0, remarks: '' }));
    setClientSearch('');
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
      <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-900">
        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><PlusCircle size={24} /></div>
        單筆核銷補登
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">區域</label>
            <select className="w-full p-4 border rounded-2xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>
              {options.regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">社工姓名</label>
            <select className="w-full p-4 border rounded-2xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.worker} onChange={e => setFormData({...formData, worker: e.target.value})}>
              {options.workers.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5 relative" ref={dropdownRef}>
          <label className="text-xs font-bold text-slate-500 ml-1">個案姓名 (可搜尋)</label>
          <div className="relative">
            <input 
              type="text"
              placeholder="輸入關鍵字搜尋個案..."
              className="w-full p-4 border rounded-2xl text-sm bg-slate-50 pl-11 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              value={clientSearch}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setFormData({ ...formData, clientName: e.target.value });
                setShowDropdown(true);
              }}
            />
            <Search className="absolute left-4 top-4 text-slate-400" size={18} />
          </div>
          
          {showDropdown && filteredClients.length > 0 && (
            <div className="absolute z-20 w-full mt-2 bg-white border rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
              <div className="p-2">
                {filteredClients.map((client, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectClient(client)}
                    className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium">{client}</span>
                    <CheckCircle2 size={14} className="opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">補助項目</label>
            <select className="w-full p-4 border rounded-2xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})}>
              {options.items.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">金額 ($)</label>
            <input type="number" className="w-full p-4 border rounded-2xl text-sm bg-slate-50 font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">經費來源</label>
            <select className="w-full p-4 border rounded-2xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
              {options.sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">備註常用選項</label>
            <select className="w-full p-4 border rounded-2xl text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none" value="" onChange={e => e.target.value && setFormData({...formData, remarks: e.target.value})}>
              <option value="">快速填入備註...</option>
              {options.remarks.map(rem => <option key={rem} value={rem}>{rem}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 ml-1">詳細備註</label>
          <textarea placeholder="請在此輸入詳細備註說明..." className="w-full p-4 border rounded-2xl text-sm min-h-24 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/30" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
        </div>
        
        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">儲存核銷紀錄</button>
      </form>
    </div>
  );
};

// --- 子組件：批次匯入 ---
const ImportTab = ({ onImport, options }: { onImport: (newRecords: SubsidyRecord[]) => void, options: NGOOptions }) => {
  const [file, setFile] = useState<File | null>(null);
  const [region, setRegion] = useState(options.regions[0] || '');
  const [worker, setWorker] = useState(options.workers[0] || '');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SubsidyRecord[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const results = await parseExcelFile(file, { region, worker, month });
      setPreview(results.map(r => ({ ...r, id: generateId() })));
    } catch (err: any) {
      alert("解析失敗: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden max-w-4xl mx-auto">
      <div className="p-8 bg-slate-50/50 border-b">
        <h2 className="text-xl font-bold flex items-center gap-2">批次 Excel 匯入</h2>
      </div>
      <div className="p-8 grid grid-cols-3 gap-4">
        <select className="p-4 border rounded-2xl text-sm" value={region} onChange={e => setRegion(e.target.value)}>{options.regions.map(r => <option key={r} value={r}>{r}</option>)}</select>
        <select className="p-4 border rounded-2xl text-sm" value={worker} onChange={e => setWorker(e.target.value)}>{options.workers.map(w => <option key={w} value={w}>{w}</option>)}</select>
        <input type="month" className="p-4 border rounded-2xl text-sm" value={month} onChange={e => setMonth(e.target.value)} />
      </div>
      <div className="p-8">
        <div className="border-2 border-dashed border-slate-200 p-12 text-center rounded-3xl bg-slate-50">
          <input type="file" id="excel" className="hidden" onChange={handleFileChange} accept=".xlsx,.xls"/>
          <label htmlFor="excel" className="cursor-pointer">
            <p className="font-bold text-slate-700">{file ? file.name : "點擊上傳撥款彙總表"}</p>
          </label>
        </div>
        {file && !preview.length && <button onClick={processFile} className="w-full mt-4 bg-indigo-600 text-white p-4 rounded-2xl font-bold">{loading ? "正在解析..." : "確認解析檔案"}</button>}
      </div>
      {preview.length > 0 && (
        <div className="p-8 bg-slate-900">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold">預覽解析結果 ({preview.length} 筆)</h3>
            <button onClick={() => { onImport(preview); setPreview([]); setFile(null); alert("匯入成功！"); }} className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold">確認匯入本地</button>
          </div>
          <div className="max-h-60 overflow-y-auto bg-slate-800 p-4 rounded-xl text-xs text-slate-400">
            {preview.map((p, i) => <div key={i} className="py-1 border-b border-slate-700">{p.clientName} - {p.item} (${p.amount})</div>)}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 子組件：紀錄查詢 ---
const RecordsTable = ({ records, onDelete, onClearAll, syncUrl }: { records: SubsidyRecord[], onDelete: (id: string) => void, onClearAll: () => void, syncUrl?: string }) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!syncUrl) return alert("請先至系統設定填寫 Google Apps Script 網址");
    setSyncing(true);
    const success = await syncToGoogleSheets(syncUrl, records);
    setSyncing(false);
    alert(success ? "雲端同步成功！" : "同步失敗，請檢查網路或網址。");
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border overflow-hidden">
      <div className="p-8 flex justify-between items-center border-b">
        <h2 className="text-2xl font-black">本地核銷紀錄 ({records.length})</h2>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing || records.length === 0} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
            {syncing ? <Loader2 size={16} className="animate-spin"/> : <CloudUpload size={16}/>}
            同步至雲端
          </button>
          <button onClick={() => window.confirm("確定清空本地紀錄？") && onClearAll()} className="p-2 text-red-500"><RotateCcw size={20}/></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
            <tr><th className="p-6 text-left">姓名</th><th className="p-6 text-left">項目</th><th className="p-6 text-left">經費來源</th><th className="p-6 text-right">金額</th><th className="p-6 text-center">操作</th></tr>
          </thead>
          <tbody className="divide-y">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 group">
                <td className="p-6 font-bold">{r.clientName}</td>
                <td className="p-6">{r.item}</td>
                <td className="p-6"><span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">{r.source}</span></td>
                <td className="p-6 text-right font-black text-indigo-600">${r.amount.toLocaleString()}</td>
                <td className="p-6 text-center"><button onClick={() => onDelete(r.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 子組件：儀表板 ---
const Dashboard = ({ records }: { records: SubsidyRecord[] }) => {
  const totalAmount = useMemo(() => records.reduce((sum, r) => sum + r.amount, 0), [records]);
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateAI = async () => {
    if (records.length === 0) return;
    setLoading(true);
    setInsight(await getFinancialInsights(records));
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-indigo-50"><CloudUpload size={80}/></div>
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest relative z-10">核銷累計總額</p>
        <p className="text-5xl font-black text-indigo-600 mt-4 relative z-10">${totalAmount.toLocaleString()}</p>
      </div>
      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black flex items-center gap-2"><Sparkles className="text-indigo-500" size={22}/> AI 財務洞察分析</h2>
          <button onClick={generateAI} disabled={loading || records.length === 0} className="bg-indigo-600 text-white px-6 py-2 rounded-2xl text-xs font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? '分析中...' : '生成趨勢報告'}
          </button>
        </div>
        {insight ? (
          <div className="bg-slate-50 p-6 rounded-2xl relative border">
            <button onClick={() => { navigator.clipboard.writeText(insight); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-sm">
              {copied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} className="text-slate-400"/>}
            </button>
            <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed font-medium">{insight}</div>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
            <p className="text-slate-400 text-sm font-medium">目前尚無分析資料，點擊按鈕啟動 AI 生成報告。</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 子組件：登入介面 ---
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === '2025ngo') {
      onLogin();
    } else {
      setError(true);
      setPass('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-['Inter']">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      <div className="bg-white w-full max-w-md p-12 rounded-[3.5rem] shadow-2xl text-center relative z-10 border border-white/20 animate-in fade-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl text-white mb-10 shadow-2xl">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">CCSA個案經濟補助</h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-12">核銷系統存取控制</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="password" 
            placeholder="請輸入通行碼" 
            className={`w-full px-6 py-5 rounded-2xl bg-slate-50 border ${error ? 'border-red-500' : 'border-slate-100 focus:border-indigo-500'} text-center text-2xl font-black tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all`} 
            value={pass} 
            onChange={e => { setPass(e.target.value); setError(false); }}
            autoFocus
          />
          {error && <p className="text-red-500 text-[10px] font-bold mt-2 animate-pulse">通行碼錯誤，請重新輸入</p>}
          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:shadow-2xl active:scale-95 transition-all">驗證身分</button>
        </form>
      </div>
    </div>
  );
};

// --- App 核心入口 ---
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [records, setRecords] = useState<SubsidyRecord[]>(() => {
    const saved = localStorage.getItem('ngo_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [options, setOptions] = useState<NGOOptions>(() => {
    const saved = localStorage.getItem('ngo_settings');
    return saved ? JSON.parse(saved) : NGO_CONFIG;
  });

  useEffect(() => localStorage.setItem('ngo_records', JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem('ngo_settings', JSON.stringify(options)), [options]);
  useEffect(() => {
    if (localStorage.getItem('ngo_auth') === 'true') setIsLoggedIn(true);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('ngo_auth', 'true');
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;

  const NavWatcher = ({ tab }: { tab: AppTab }) => { useEffect(() => setActiveTab(tab), [tab]); return null; };

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar activeTab={activeTab} onLogout={() => { setIsLoggedIn(false); localStorage.removeItem('ngo_auth'); }} />
        <main className="flex-1 ml-64 p-10">
          <header className="mb-10 flex justify-between items-end border-b border-slate-200 pb-8">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workspace</div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{activeTab}</h1>
            </div>
            <div className={`px-5 py-2 rounded-2xl text-[10px] font-black tracking-widest border flex items-center gap-2 transition-all ${options.syncUrl ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
              {options.syncUrl ? <CloudCheck size={14}/> : <CloudOff size={14}/>}
              {options.syncUrl ? 'CLOUD READY' : 'LOCAL MODE'}
            </div>
          </header>
          
          <div className="max-w-[1200px]">
            <Routes>
              <Route path="/dashboard" element={<><NavWatcher tab={AppTab.DASHBOARD}/><Dashboard records={records}/></>} />
              <Route path="/import" element={<><NavWatcher tab={AppTab.IMPORT}/><ImportTab onImport={r => setRecords(p => [...r, ...p])} options={options}/></>} />
              <Route path="/manual" element={<><NavWatcher tab={AppTab.MANUAL}/><ManualEntry onAdd={r => setRecords(p => [r, ...p])} options={options}/></>} />
              <Route path="/records" element={<><NavWatcher tab={AppTab.RECORDS}/><RecordsTable records={records} onDelete={id => setRecords(p => p.filter(x => x.id !== id))} onClearAll={() => setRecords([])} syncUrl={options.syncUrl}/></>} />
              <Route path="/settings" element={<><NavWatcher tab={AppTab.SETTINGS}/><SettingsPage options={options} setOptions={setOptions}/></>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
