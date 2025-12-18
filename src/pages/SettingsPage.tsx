
import React, { useState, useEffect } from "react";
import { User, Lock, Save, AlertCircle, CheckCircle, Server, Power } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { userApi, adminApi } from "../api/api";
import { ServerConfig } from "../types";

export const SettingsPage = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "server">("profile");
  
  // Profile State
  const [name, setName] = useState(user?.name || "");
  const [signature, setSignature] = useState(user?.signature || "");
  
  // Password State
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  
  // Server Config State
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
      if(activeTab === "server" && isAdmin) {
          loadServerConfig();
      }
  }, [activeTab, isAdmin]);

  const loadServerConfig = async () => {
      const config = await adminApi.getServerConfig();
      setServerConfig(config);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await userApi.updateProfile(name, signature);
      setMessage({ type: "success", text: "个人资料更新成功" });
    } catch (e) {
      setMessage({ type: "error", text: "更新个人资料失败" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await userApi.changePassword(oldPass, newPass);
      setMessage({ type: "success", text: "密码修改成功" });
      setOldPass("");
      setNewPass("");
    } catch (e) {
      setMessage({ type: "error", text: "修改密码失败" });
    } finally {
      setLoading(false);
    }
  };

  const handleServerUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!serverConfig) return;
      setLoading(true);
      try {
          await adminApi.updateServerConfig(serverConfig);
          setMessage({ type: "success", text: "服务器配置已更新" });
      } catch(e) {
          setMessage({ type: "error", text: "更新失败" });
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto p-8 h-full">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">账户与系统设置</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
                activeTab === "profile" 
                  ? "bg-white text-blue-600 border-b-2 border-blue-600" 
                  : "bg-gray-50 text-gray-600 hover:text-gray-900"
              }`}
            >
              <User size={18} /> 个人资料
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
                activeTab === "security" 
                  ? "bg-white text-blue-600 border-b-2 border-blue-600" 
                  : "bg-gray-50 text-gray-600 hover:text-gray-900"
              }`}
            >
              <Lock size={18} /> 安全设置
            </button>
            {isAdmin && (
                <button
                onClick={() => setActiveTab("server")}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-4 ${
                    activeTab === "server" 
                    ? "bg-white text-purple-600 border-b-2 border-purple-600" 
                    : "bg-gray-50 text-gray-600 hover:text-gray-900"
                }`}
                >
                <Server size={18} /> 服务器参数
                </button>
            )}
          </div>

          <div className="p-8">
            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 text-sm ${
                message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </div>
            )}

            {activeTab === "profile" && (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">全名</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                   <input
                    type="text"
                    disabled
                    value={user?.email}
                    className="w-full p-2.5 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮件签名</label>
                  <textarea
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Sent from my MailCOM..."
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70"
                  >
                    <Save size={18} /> 保存更改
                  </button>
                </div>
              </form>
            )}

            {activeTab === "security" && (
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                  <input
                    type="password"
                    required
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70"
                  >
                    <Save size={18} /> 更新密码
                  </button>
                </div>
              </form>
            )}

            {activeTab === "server" && serverConfig && (
                <form onSubmit={handleServerUpdate} className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                             <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Server size={18} /> 端口设置
                             </h3>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">SMTP 端口</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        value={serverConfig.smtpPort}
                                        onChange={e => setServerConfig({...serverConfig, smtpPort: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">POP3 端口</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        value={serverConfig.pop3Port}
                                        onChange={e => setServerConfig({...serverConfig, pop3Port: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">服务器域名</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        value={serverConfig.domain}
                                        onChange={e => setServerConfig({...serverConfig, domain: e.target.value})}
                                    />
                                </div>
                             </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                             <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Power size={18} /> 服务控制
                             </h3>
                             <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                    <span className="text-sm font-medium">SMTP 服务 (发信)</span>
                                    <button 
                                        type="button"
                                        onClick={() => setServerConfig({...serverConfig, smtpEnabled: !serverConfig.smtpEnabled})}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${serverConfig.smtpEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${serverConfig.smtpEnabled ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                    <span className="text-sm font-medium">POP3 服务 (收信)</span>
                                    <button 
                                        type="button"
                                        onClick={() => setServerConfig({...serverConfig, pop3Enabled: !serverConfig.pop3Enabled})}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${serverConfig.pop3Enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${serverConfig.pop3Enabled ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    * 停止服务将导致客户端无法连接。
                                </p>
                             </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2 disabled:opacity-70"
                        >
                            <Save size={18} /> 保存配置
                        </button>
                    </div>
                </form>
            )}
          </div>
        </div>
      </div>
       <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
};
