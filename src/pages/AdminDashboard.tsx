
import React, { useEffect, useState } from "react";
import { Users, Server, Activity, Search, Shield, ShieldOff, Play, Trash2, RotateCw, RefreshCcw } from "lucide-react";
import { adminApi } from "../api/api";
import { AdminUserSummary, EmailQueueItem } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";

export const AdminDashboard = ({ mode = "dashboard" }: { mode?: "dashboard" | "users" }) => {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [queue, setQueue] = useState<EmailQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [infoModal, setInfoModal] = useState<{open: boolean, title?: string, message: string} | null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, queueData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getQueueStatus()
      ]);
      setUsers(userData);
      setQueue(queueData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQueue = async () => {
    setIsQueueLoading(true);
    try {
        const queueData = await adminApi.getQueueStatus();
        setQueue(queueData);
    } finally {
        setIsQueueLoading(false);
    }
  }

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await adminApi.toggleUserStatus(id, !currentStatus);
      setUsers(users.map(u => u.id === id ? { ...u, enabled: !u.enabled } : u));
    } catch (e) {
      setInfoModal({ open: true, title: "更新失败", message: "更新用户状态失败。" });
    }
  };

  const processQueue = async () => {
      setConfirmState({
        open: true,
        title: "处理队列",
        message: "处理所有待发送邮件？",
        onConfirm: async () => {
          await adminApi.processQueue();
          refreshQueue();
          setConfirmState(null);
        }
      });
  }

  const clearQueue = async () => {
      setConfirmState({
        open: true,
        title: "清空队列",
        message: "确定吗？这将删除所有待发送邮件。",
        onConfirm: async () => {
          await adminApi.clearQueue();
          refreshQueue();
          setConfirmState(null);
        }
      });
  }
  
  const retryItem = async (id: number) => {
     try {
         await adminApi.resendQueueItem(id);
         refreshQueue();
     } catch(e) { setInfoModal({ open: true, title: "重试失败", message: "队列项重试失败。" }); }
  }
  
  const deleteUser = async (id: number) => {
    setConfirmState({
      open: true,
      title: "删除用户",
      message: "确定删除该用户？此操作不可恢复。",
      onConfirm: async () => {
        try {
          await adminApi.deleteUser(id);
          setUsers(users.filter(u => u.id !== id));
        } catch (e) {
          setInfoModal({ open: true, title: "删除失败", message: "删除用户失败，请稍后重试。" });
        }
        setConfirmState(null);
      }
    });
  }

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color} text-white`}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-sm text-gray-500 font-medium">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );

  if (mode === "users") {
    return (
      <>
      <div className="flex-1 bg-gray-50 overflow-y-auto p-8 h-full">
        <div className="mb-8 flex justify-between items-center">
          <div>
              <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
              <p className="text-gray-500">查看与维护系统用户</p>
          </div>
          <button onClick={loadData} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <RotateCw size={18} />
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">用户管理</h2>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索用户..." 
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-medium">
                <tr>
                  <th className="px-6 py-3">用户</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">最后登录</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={4} className="p-8 text-center">加载中...</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {user.username.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.username}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.enabled ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.enabled ? "bg-green-500" : "bg-red-500"}`}></span>
                        {user.enabled ? "正常" : "禁用"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleStatus(user.id, user.enabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.enabled ? "hover:bg-red-50 text-gray-400 hover:text-red-600" : "hover:bg-green-50 text-gray-400 hover:text-green-600"
                        }`}
                        title={user.enabled ? "禁用用户" : "启用用户"}
                      >
                        {user.enabled ? <ShieldOff size={18} /> : <Shield size={18} />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 ml-2"
                        title="删除用户"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      {infoModal?.open && (
        <ConfirmDialog
          open={true}
          title={infoModal.title}
          message={infoModal.message}
          confirmText="好的"
          onConfirm={() => setInfoModal(null)}
        />
      )}
      </>
    );
  }
  return (
    <>
    <div className="flex-1 bg-gray-50 overflow-y-auto p-8 h-full">
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">管理仪表盘</h1>
            <p className="text-gray-500">系统概览与用户管理</p>
        </div>
        <button onClick={loadData} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <RotateCw size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={Users} label="总用户数" value={users.length} color="bg-blue-600" />
        <StatCard icon={Server} label="系统状态" value="在线" color="bg-green-500" />
        <StatCard icon={Activity} label="待处理队列" value={queue.filter(q => q.status === 'PENDING').length} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        {/* Queue Monitor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Activity size={18} className="text-orange-500"/> 邮件队列
                </h2>
                <div className="flex gap-2">
                    <button onClick={processQueue} className="text-xs flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition">
                        <Play size={14} /> 处理
                    </button>
                    <button onClick={clearQueue} className="text-xs flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">
                        <Trash2 size={14} /> 清空
                    </button>
                    <button onClick={refreshQueue} className={`text-gray-400 hover:text-gray-600 ${isQueueLoading ? 'animate-spin' : ''}`}>
                        <RotateCw size={16} />
                    </button>
                </div>
            </div>
            <div className="overflow-y-auto flex-1 p-0">
                {queue.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">队列为空</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">ID</th>
                                <th className="px-4 py-2">状态</th>
                                <th className="px-4 py-2">信息</th>
                                <th className="px-4 py-2 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {queue.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-gray-600">#{item.id}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            item.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                            item.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>{item.status}</span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 text-xs">
                                        <div className="text-gray-700 truncate max-w-[240px]" title={item.subject || ""}>
                                            {item.subject || "（无主题）"}
                                        </div>
                                        <div
                                            className="truncate max-w-[240px]"
                                            title={(item.recipients || []).join(", ")}
                                        >
                                            收件人: {(item.recipients || []).join(", ") || "—"}
                                        </div>
                                        <div>重试: {item.retryCount}</div>
                                        {item.errorMessage && <div className="text-red-500 truncate max-w-[100px]" title={item.errorMessage}>{item.errorMessage}</div>}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {item.status === 'FAILED' && (
                                            <button onClick={() => retryItem(item.id)} className="text-blue-500 hover:text-blue-700 p-1" title="Retry">
                                                <RefreshCcw size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">用户管理</h2>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索用户..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-3">用户</th>
                <th className="px-6 py-3">状态</th>
                <th className="px-6 py-3">最后登录</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center">加载中...</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {user.username.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.enabled ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.enabled ? "bg-green-500" : "bg-red-500"}`}></span>
                      {user.enabled ? "正常" : "禁用"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(user.lastLogin).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleStatus(user.id, user.enabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.enabled ? "hover:bg-red-50 text-gray-400 hover:text-red-600" : "hover:bg绿-50 text-gray-400 hover:text绿-600"
                      }`}
                      title={user.enabled ? "禁用用户" : "启用用户"}
                    >
                      {user.enabled ? <ShieldOff size={18} /> : <Shield size={18} />}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 ml-2"
                      title="删除用户"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    {infoModal?.open && (
      <ConfirmDialog
        open={true}
        title={infoModal.title}
        message={infoModal.message}
        confirmText="好的"
        onConfirm={() => setInfoModal(null)}
      />
    )}
    </>
  );
};
