
import React, { useState, useEffect } from "react";
import { FileText, RefreshCw, Trash2, Filter, AlertTriangle, Info } from "lucide-react";
import { adminApi } from "../api/api";
import { LogEntry } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";

export const AdminLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState<string>("ALL");
  const [confirmState, setConfirmState] = useState<{open: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await adminApi.getLogs();
    setLogs(data);
    setLoading(false);
  };

  const clearLogs = async () => {
    setConfirmState({
      open: true,
      title: "清空日志",
      message: "确定清空所有日志？",
      onConfirm: async () => {
        await adminApi.clearLogs();
        loadLogs();
        setConfirmState(null);
      }
    });
  };

  const filteredLogs = filterService === "ALL" ? logs : logs.filter(l => l.service === filterService);

  return (
    <>
    <div className="flex-1 bg-gray-50 overflow-y-auto p-8 h-full">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="text-blue-600" /> 日志管理
                </h1>
                <p className="text-gray-500">监控 SMTP 和 POP3 服务器运行状态。</p>
            </div>
            <div className="flex gap-2">
                 <button onClick={loadLogs} className="bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <RefreshCw size={16} /> 刷新
                </button>
                 <button onClick={clearLogs} className="bg-white border border-gray-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 flex items-center gap-2">
                    <Trash2 size={16} /> 清空日志
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-4 bg-gray-50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Filter size={16} /> 筛选服务:
                </div>
                <select 
                    className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filterService}
                    onChange={e => setFilterService(e.target.value)}
                >
                    <option value="ALL">全部服务</option>
                    <option value="SMTP">SMTP</option>
                    <option value="POP3">POP3</option>
                    <option value="SYSTEM">系统</option>
                </select>
            </div>
            
            {/* Logs Console */}
            <div className="flex-1 overflow-y-auto bg-gray-900 text-gray-300 font-mono text-sm p-4">
                {loading ? (
                    <div className="text-center py-10">加载中...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-10 opacity-50">暂无日志记录</div>
                ) : (
                    <div className="space-y-1">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="flex gap-4 hover:bg-gray-800 p-1 rounded">
                                <span className="text-gray-500 shrink-0 w-44">{new Date(log.timestamp).toLocaleString()}</span>
                                <span className={`shrink-0 w-16 font-bold ${
                                    log.level === 'ERROR' ? 'text-red-500' : 
                                    log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-400'
                                }`}>[{log.level}]</span>
                                <span className="text-purple-400 shrink-0 w-16">{log.service}</span>
                                <span className="text-gray-300">{log.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
    {confirmState?.open && (
      <ConfirmDialog
        open={true}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="确认"
        cancelText="取消"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    )}
    </>
  );
};
