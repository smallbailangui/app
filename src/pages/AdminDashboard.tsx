
import React, { useEffect, useState } from "react";
import { Users, Server, Activity, Search, Shield, ShieldOff, Play, Trash2, RotateCw, RefreshCcw, Plus, X, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { adminApi } from "../api/api";
import { AdminUserSummary, EmailQueueItem } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

export const AdminDashboard = ({ mode = "dashboard" }: { mode?: "dashboard" | "users" }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [queue, setQueue] = useState<EmailQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [infoModal, setInfoModal] = useState<{open: boolean, title?: string, message: string} | null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [searchText, setSearchText] = useState("");
  const [createUserModal, setCreateUserModal] = useState<{open: boolean}>({ open: false });
  const [createForm, setCreateForm] = useState<{username: string, email: string, password: string}>({ username: "", email: "", password: "" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState<{open: boolean, user: AdminUserSummary | null}>({ open: false, user: null });
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
      setUsers((prev) => prev.map(u => u.id === id ? { ...u, enabled: !u.enabled } : u));
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
          setUsers((prev) => prev.filter(u => u.id !== id));
        } catch (e) {
          setInfoModal({ open: true, title: "删除失败", message: "删除用户失败，请稍后重试。" });
        }
        setConfirmState(null);
      }
    });
  }
  
  const toggleRole = async (id: number, currentIsAdmin: boolean) => {
    const nextIsAdmin = !currentIsAdmin;
    setConfirmState({
      open: true,
      title: nextIsAdmin ? "授权管理员" : "取消管理员",
      message: nextIsAdmin ? "将该用户授权为管理员？" : "取消该用户的管理员权限？",
      onConfirm: async () => {
        try {
          await adminApi.updateUserRole(id, nextIsAdmin);
          setUsers((prev) => prev.map(u => u.id === id ? { ...u, isAdmin: nextIsAdmin } : u));
        } catch (e: any) {
          setInfoModal({ open: true, title: "操作失败", message: e?.message || "更新用户权限失败。" });
        }
        setConfirmState(null);
      }
    });
  };

  const openCreateUser = () => {
    setIsCreatingUser(false);
    setCreateForm({ username: "", email: "", password: "" });
    setCreateUserModal({ open: true });
  };
  
  const submitCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingUser) return;
    setIsCreatingUser(true);
    try {
      await adminApi.createUser(createForm.username.trim(), createForm.email.trim(), createForm.password);
      setCreateUserModal({ open: false });
      setInfoModal({ open: true, title: "创建成功", message: "用户已创建。" });
      loadData();
    } catch (err: any) {
      setInfoModal({ open: true, title: "创建失败", message: err?.message || "创建用户失败。" });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const openResetPassword = (u: AdminUserSummary) => {
    setResetPasswordValue("");
    setResetPasswordModal({ open: true, user: u });
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModal.user || isResettingPassword) return;
    const id = resetPasswordModal.user.id;
    setIsResettingPassword(true);
    try {
      await adminApi.resetUserPassword(id, resetPasswordValue);
      setResetPasswordModal({ open: false, user: null });
      setInfoModal({ open: true, title: "修改成功", message: "用户密码已更新。" });
    } catch (err: any) {
      setInfoModal({ open: true, title: "修改失败", message: err?.message || "修改用户密码失败。" });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;
  const filteredUsers = users.filter((u) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    return (u.username || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const UserManagementCard = ({ title }: { title: string }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={openCreateUser}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> 创建用户
          </button>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索用户..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium">
            <tr>
              <th className="px-6 py-3">用户</th>
              <th className="px-6 py-3">角色</th>
              <th className="px-6 py-3">状态</th>
              <th className="px-6 py-3">最后登录</th>
              <th className="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center">加载中...</td></tr>
            ) : filteredUsers.map((u) => {
              const isSelf = currentUserId !== null && u.id === currentUserId;
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {u.username.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{u.username}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.isAdmin ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isAdmin ? "bg-purple-500" : "bg-gray-400"}`}></span>
                      {u.isAdmin ? "管理员" : "普通用户"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.enabled ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.enabled ? "bg-green-500" : "bg-red-500"}`}></span>
                      {u.enabled ? "正常" : "禁用"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(u.lastLogin).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleRole(u.id, u.isAdmin)}
                      className={`p-2 rounded-lg transition-colors ${isSelf ? "opacity-50 cursor-not-allowed" : "text-gray-400 hover:bg-purple-50 hover:text-purple-700"}`}
                      title={u.isAdmin ? "取消管理员" : "授权管理员"}
                      disabled={isSelf}
                    >
                      <ShieldCheck size={18} />
                    </button>
                    <button
                      onClick={() => openResetPassword(u)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-700 ml-2"
                      title="修改密码"
                    >
                      <KeyRound size={18} />
                    </button>
                    <button 
                      onClick={() => toggleStatus(u.id, u.enabled)}
                      className={`p-2 rounded-lg transition-colors ml-2 ${
                        u.enabled ? "hover:bg-red-50 text-gray-400 hover:text-red-600" : "hover:bg-green-50 text-gray-400 hover:text-green-600"
                      }`}
                      title={u.enabled ? "禁用用户" : "启用用户"}
                    >
                      {u.enabled ? <ShieldOff size={18} /> : <Shield size={18} />}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className={`p-2 rounded-lg ml-2 ${isSelf ? "opacity-50 cursor-not-allowed text-gray-300" : "text-gray-400 hover:bg-red-50 hover:text-red-600"}`}
                      title="删除用户"
                      disabled={isSelf}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

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
        <UserManagementCard title="用户管理" />
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
      {createUserModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">创建用户</h2>
                <p className="text-sm text-gray-500">为系统创建一个新账号</p>
              </div>
              <button
                onClick={() => { if (!isCreatingUser) setCreateUserModal({ open: false }); }}
                className={`text-gray-400 hover:text-gray-700 ${isCreatingUser ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isCreatingUser}
              >
                <X size={22} />
              </button>
            </div>
            <form onSubmit={submitCreateUser} className="p-6 space-y-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  name="admin-create-user-username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  autoComplete="off"
                  disabled={isCreatingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  name="admin-create-user-email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  autoComplete="off"
                  disabled={isCreatingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">初始密码</label>
                <input
                  type="password"
                  name="admin-create-user-password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={isCreatingUser}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateUserModal({ open: false })}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={isCreatingUser}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {resetPasswordModal.open && resetPasswordModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">修改用户密码</h2>
                <p className="text-sm text-gray-500">{resetPasswordModal.user.username} ({resetPasswordModal.user.email})</p>
              </div>
              <button
                onClick={() => { if (!isResettingPassword) setResetPasswordModal({ open: false, user: null }); }}
                className={`text-gray-400 hover:text-gray-700 ${isResettingPassword ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isResettingPassword}
              >
                <X size={22} />
              </button>
            </div>
            <form onSubmit={submitResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <input
                  type="password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  minLength={6}
                  disabled={isResettingPassword}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModal({ open: false, user: null })}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={isResettingPassword}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                  更新
                </button>
              </div>
            </form>
          </div>
        </div>
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
      <UserManagementCard title="用户管理" />
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
    {createUserModal.open && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">创建用户</h2>
              <p className="text-sm text-gray-500">为系统创建一个新账号</p>
            </div>
            <button
              onClick={() => { if (!isCreatingUser) setCreateUserModal({ open: false }); }}
              className={`text-gray-400 hover:text-gray-700 ${isCreatingUser ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isCreatingUser}
            >
              <X size={22} />
            </button>
          </div>
          <form onSubmit={submitCreateUser} className="p-6 space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                name="admin-create-user-username"
                value={createForm.username}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                autoComplete="off"
                disabled={isCreatingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                name="admin-create-user-email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                autoComplete="off"
                disabled={isCreatingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">初始密码</label>
              <input
                type="password"
                name="admin-create-user-password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={isCreatingUser}
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateUserModal({ open: false })}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isCreatingUser}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                disabled={isCreatingUser}
              >
                {isCreatingUser ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                创建
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    {resetPasswordModal.open && resetPasswordModal.user && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">修改用户密码</h2>
              <p className="text-sm text-gray-500">{resetPasswordModal.user.username} ({resetPasswordModal.user.email})</p>
            </div>
            <button
              onClick={() => { if (!isResettingPassword) setResetPasswordModal({ open: false, user: null }); }}
              className={`text-gray-400 hover:text-gray-700 ${isResettingPassword ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isResettingPassword}
            >
              <X size={22} />
            </button>
          </div>
          <form onSubmit={submitResetPassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
              <input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                minLength={6}
                disabled={isResettingPassword}
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetPasswordModal({ open: false, user: null })}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isResettingPassword}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                更新
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};
