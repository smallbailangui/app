
import React from "react";
import {
  Inbox,
  Send,
  File,
  Trash2,
  AlertOctagon,
  PenSquare,
  Star,
  LogOut,
  LayoutDashboard,
  Users,
  Settings,
  ShieldCheck,
  Ban,
  Group,
  FileText
} from "lucide-react";
import { Folder, Role } from "../types";

interface SidebarProps {
  role: Role;
  currentView: string; // Folder or Admin Page
  onNavigate: (view: any) => void;
  onCompose: () => void;
  onLogout: () => void;
  unreadCount?: number;
}

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2 mb-1 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-blue-100 text-blue-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} />
      <span>{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ 
  role, 
  currentView, 
  onNavigate, 
  onCompose, 
  onLogout, 
  unreadCount 
}) => {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-4 flex items-center gap-2 text-blue-600 font-bold text-xl">
        <div className={`w-8 h-8 ${role === 'ADMIN' ? 'bg-purple-600' : 'bg-blue-600'} rounded-lg flex items-center justify-center text-white`}>
          {role === 'ADMIN' ? <ShieldCheck size={18} /> : <Send size={18} className="ml-1" />}
        </div>
        MailCOM
        {role === 'ADMIN' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-auto">管理员</span>}
      </div>

      <div className="px-4 py-2">
        <button
          onClick={onCompose}
          className="w-full bg-white border border-gray-200 shadow-sm hover:shadow text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
        >
          <PenSquare size={18} /> {role === 'ADMIN' ? '发布公告' : '撰写邮件'}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {role === 'ADMIN' ? (
          <>
            <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">管理控制台</div>
            <SidebarItem
              icon={LayoutDashboard}
              label="仪表盘"
              active={currentView === "dashboard"}
              onClick={() => onNavigate("dashboard")}
            />
            <SidebarItem
              icon={Users}
              label="用户管理"
              active={currentView === "users"}
              onClick={() => onNavigate("users")}
            />
             <SidebarItem
              icon={Group}
              label="群组管理"
              active={currentView === "groups"}
              onClick={() => onNavigate("groups")}
            />
             <SidebarItem
              icon={Ban}
              label="黑名单"
              active={currentView === "blacklist"}
              onClick={() => onNavigate("blacklist")}
            />
             <SidebarItem
              icon={FileText}
              label="日志管理"
              active={currentView === "logs"}
              onClick={() => onNavigate("logs")}
            />
             <SidebarItem
              icon={Settings}
              label="系统设置"
              active={currentView === "settings"}
              onClick={() => onNavigate("settings")}
            />
            <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">个人邮箱</div>
             <SidebarItem
              icon={Inbox}
              label="我的收件箱"
              active={currentView === "inbox"}
              onClick={() => onNavigate("inbox")}
              count={unreadCount}
            />
            <SidebarItem
              icon={Star}
              label="已加星标"
              active={currentView === "starred"}
              onClick={() => onNavigate("starred")}
            />
            <SidebarItem
              icon={Send}
              label="已发送"
              active={currentView === "sent"}
              onClick={() => onNavigate("sent")}
            />
            <SidebarItem
              icon={File}
              label="草稿箱"
              active={currentView === "drafts"}
              onClick={() => onNavigate("drafts")}
            />
            <SidebarItem
              icon={Trash2}
              label="已删除"
              active={currentView === "trash"}
              onClick={() => onNavigate("trash")}
            />
          </>
        ) : (
          <>
            <SidebarItem
              icon={Inbox}
              label="收件箱"
              active={currentView === "inbox"}
              onClick={() => onNavigate("inbox")}
              count={unreadCount}
            />
            <SidebarItem
              icon={Star}
              label="已加星标"
              active={currentView === "starred"}
              onClick={() => onNavigate("starred")}
            />
            <SidebarItem
              icon={Send}
              label="已发送"
              active={currentView === "sent"}
              onClick={() => onNavigate("sent")}
            />
            <SidebarItem
              icon={File}
              label="草稿箱"
              active={currentView === "drafts"}
              onClick={() => onNavigate("drafts")}
            />
            <SidebarItem
              icon={AlertOctagon}
              label="垃圾邮件"
              active={currentView === "junk"}
              onClick={() => onNavigate("junk")}
            />
            <SidebarItem
              icon={Trash2}
              label="已删除"
              active={currentView === "trash"}
              onClick={() => onNavigate("trash")}
            />
            <div className="my-4 border-t border-gray-200"></div>
            <SidebarItem
              icon={Group}
              label="我的群组"
              active={currentView === "groups"}
              onClick={() => onNavigate("groups")}
            />
            <SidebarItem
              icon={Settings}
              label="设置"
              active={currentView === "settings"}
              onClick={() => onNavigate("settings")}
            />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={18} />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  );
};
