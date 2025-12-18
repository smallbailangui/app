
import React, { useState } from "react";
import { Send, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const AuthPage = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<{ open: boolean; title: string; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(identifier, password);
        // Context updates automatically, App.tsx will re-render
      } else {
        const raw = registerUsername.trim();
        const localPart = raw.includes("@") ? raw.split("@")[0] : raw;
        if (!localPart) {
          throw new Error("请输入用户名");
        }
        const emailAddress = `${localPart}@mb.com`;
        await register(emailAddress, emailAddress, password);
        setInfoModal({ open: true, title: "注册成功", message: `账号已创建：${emailAddress}。请使用该账号登录。` });
        setIsLogin(true);
        setIdentifier(emailAddress);
        setRegisterUsername("");
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center animate-fade-in">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
          <Send size={32} className="ml-1" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">MailCOM</h1>
        <p className="text-gray-500 mt-2">邮件管理系统</p>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 p-8 animate-slide-up">
        <div className="flex gap-4 mb-8 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => { setIsLogin(true); setError(null); setPassword(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            登录
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); setPassword(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              !isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              {isLogin ? "邮箱或用户名" : "用户名"}
            </label>
            {isLogin ? (
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="user 或 admin"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            ) : (
              <div className="flex w-full">
                <input
                  type="text"
                  required
                  className="flex-1 px-4 py-2.5 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="输入用户名"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                />
                <div className="px-4 py-2.5 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 flex items-center">
                  @mb.com
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">密码</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                {isLogin ? "登录" : "创建账户"} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>请使用注册的账号登录</p>
        </div>
      </div>
      {infoModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-100 p-6">
            <div className="text-lg font-semibold text-gray-900">{infoModal.title}</div>
            <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{infoModal.message}</div>
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                onClick={() => setInfoModal(null)}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
       <style>{`
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
      `}</style>
    </div>
  );
};
