
import React, { useState, useEffect } from "react";
import {
  Inbox,
  Trash2,
  AlertOctagon,
  Reply,
  Forward,
  ChevronLeft,
  Star,
  Paperclip,
  Download
} from "lucide-react";
import { Email } from "../types";

interface EmailDetailProps {
  email: Email | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReply: (email: Email, body?: string) => void;
  onForward: (email: Email) => void;
  onToggleStar: (email: Email) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onClose,
  onDelete,
  onReply,
  onForward,
  onToggleStar
}) => {
  const [replySuggestions, setReplySuggestions] = useState<string[]>([]);

  // Reset AI state when email changes
  useEffect(() => {
    setReplySuggestions([]);
  }, [email?.id]);

  // 移除 AI 总结与智能回复

  if (!email) {
    return (
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-gray-300 h-full bg-white">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Inbox size={48} />
        </div>
        <p className="text-lg font-medium text-gray-400">
          选择一封邮件开始阅读
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white h-full relative">
      <div className="h-16 border-b border-gray-200 flex items-center px-6 bg-white shrink-0">
        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-full mr-2"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
            {email.subject || "（无主题）"}
          </h1>
          <div className="flex gap-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
              {email.folder}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium text-lg">
              {email.from.name[0]}
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {email.from.name}
              </div>
              <div className="text-sm text-gray-500">{email.from.email}</div>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {new Date(email.date).toLocaleString()}
          </div>
        </div>

        {/* 移除 AI 功能按钮区域 */}

        {/* 移除 AI 摘要区域 */}

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Paperclip size={16} />
              <span>{email.attachments.length} 个附件</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {email.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500 font-medium text-xs uppercase">
                    {att.fileName.split('.').pop() || 'FILE'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={att.fileName}>
                      {att.fileName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(att.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  {att.filePath && (
                     <a 
                       href={`http://localhost:8000/api/attachments/download/${att.id}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                       title="下载"
                     >
                       <Download size={16} />
                     </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-gray-800 leading-relaxed whitespace-pre-line border-b border-gray-100 pb-12 mb-8">
          {email.body}
        </div>

        {/* Smart Replies Suggestions */}
        {replySuggestions.length > 0 && (
          <div className="mb-8 animate-fade-in">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              快捷回复
            </div>
            <div className="flex flex-wrap gap-2">
              {replySuggestions.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => onReply(email, reply)}
                  className="text-sm px-4 py-2 border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors text-left"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={() => onReply(email)}
            className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 font-medium text-sm"
          >
            <Reply size={18} /> 回复
          </button>
          <button 
            onClick={() => onForward(email)}
            className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 font-medium text-sm"
          >
            <Forward size={18} /> 转发
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={() => onToggleStar(email)}
              className={`p-2 rounded-full hover:bg-gray-100 ${email.isStarred ? 'text-yellow-400' : 'text-gray-500'}`}
              title="标星"
            >
              <Star size={18} className={email.isStarred ? 'fill-yellow-400' : ''} />
            </button>
            <button
              onClick={() => onDelete(email.id)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
              title="删除"
            >
              <Trash2 size={18} />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="标记为垃圾邮件">
              <AlertOctagon size={18} />
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};
