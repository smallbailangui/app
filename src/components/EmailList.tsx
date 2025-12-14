
import React from "react";
import { Search, Loader2, RefreshCw, Star, Trash2 } from "lucide-react";
import { Email, Folder } from "../types";

interface EmailListProps {
  currentFolder: Folder;
  emails: Email[];
  selectedEmailId: string | null;
  isLoading: boolean;
  onSelect: (email: Email) => void;
  onRefresh: () => void;
  onToggleStar: (email: Email) => void;
  onDelete: (id: string) => void;
}

const FOLDER_NAMES: Record<string, string> = {
    "inbox": "收件箱",
    "sent": "已发送",
    "drafts": "草稿箱",
    "junk": "垃圾邮件",
    "trash": "已删除",
    "starred": "已加星标"
};

export const EmailList: React.FC<EmailListProps> = ({
  currentFolder,
  emails,
  selectedEmailId,
  isLoading,
  onSelect,
  onRefresh,
  onToggleStar,
  onDelete
}) => {
  return (
    <div
      className={`${
        selectedEmailId ? "hidden lg:flex" : "flex"
      } flex-col w-full lg:w-96 border-r border-gray-200 bg-white shrink-0`}
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize text-gray-800">
          {FOLDER_NAMES[currentFolder] || currentFolder}
        </h2>
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          title="刷新"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="p-3 border-b border-gray-100">
        <div className="bg-gray-100 rounded-lg flex items-center px-3 py-2 text-gray-500">
          <Search size={16} />
          <input
            placeholder="搜索邮件"
            className="bg-transparent border-none ml-2 w-full text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center p-8 text-gray-400 text-sm">
            这里没有邮件。
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              onClick={() => onSelect(email)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedEmailId === email.id
                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                  : !email.isRead
                  ? "bg-white border-l-4 border-l-transparent font-semibold"
                  : "bg-white border-l-4 border-l-transparent opacity-80"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`text-sm truncate pr-2 flex-1 ${
                    !email.isRead ? "text-gray-900" : "text-gray-700"
                  }`}
                >
                  {currentFolder === 'sent' || currentFolder === 'drafts' ? `收件人: ${(email.to || []).join(', ')}` : email.from.name}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {new Date(email.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                 <div
                    className={`text-sm mb-1 truncate flex-1 ${
                    !email.isRead ? "text-gray-900" : "text-gray-600"
                    }`}
                >
                    {email.subject}
                </div>
                {currentFolder !== 'drafts' && (
                  <button 
                      onClick={(e) => { e.stopPropagation(); onToggleStar(email); }}
                      className={`p-1 rounded-full hover:bg-gray-200 ${email.isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  >
                      <Star size={16} className={email.isStarred ? 'fill-yellow-400' : ''} />
                  </button>
                )}
                {/* 独立删除按钮（草稿箱优先显示，其它文件夹也可显示） */}
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onDelete(email.id); 
                  }}
                  className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="text-xs text-gray-400 truncate">
                {email.snippet}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
