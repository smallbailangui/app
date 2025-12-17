import React, { useState, useRef, useEffect } from "react";
import { X, File as FileIcon, Send, Paperclip, Save, Radio, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { groupApi } from "../api/api";
import { Group, Email } from "../types";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string[], subject: string, body: string, files: File[]) => void;
  onSaveDraft?: (to: string[], subject: string, body: string) => void;
  onDelete?: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  lockTo?: boolean;
  forwardOf?: Email | null;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSend,
  onSaveDraft,
  onDelete,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  lockTo = false,
  forwardOf = null
}) => {
  const { isAdmin, user } = useAuth();
  
  // Initialize state with props. 
  // Since the modal is conditionally rendered (if !isOpen return null), 
  // these states will reset correctly every time it opens.
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  
  const [files, setFiles] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTo(initialTo || "");
    setSubject(initialSubject || "");
    setBody(initialBody || "");
    const shouldDefaultBroadcast = isAdmin && !lockTo && !(initialTo && initialTo.trim());
    setIsBroadcast(shouldDefaultBroadcast);
    setSelectedGroupIds([]);
    setIsGroupOpen(false);
  }, [isOpen, initialTo, initialSubject, initialBody, isAdmin, lockTo]);

  useEffect(() => {
    if (lockTo && isBroadcast) setIsBroadcast(false);
  }, [lockTo]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const loadGroups = async () => {
      try {
        const joined = await groupApi.getJoinedGroups();
        const managed = await groupApi.getManagedGroups();
        const map = new Map<number, Group>();
        [...joined, ...managed].forEach(g => map.set(g.id, g));
        if (mounted) setGroups(Array.from(map.values()));
      } catch {}
    };
    loadGroups();
    return () => { mounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendClick = async () => {
      const broadcast = isBroadcast && !lockTo;
      if (broadcast) {
        onSend(["ALL_USERS"], subject, body, files);
        return;
      }
      const typed = to.split(",").map(s => s.trim()).filter(Boolean);
      const selfEmail = user?.email ? user.email.trim().toLowerCase() : null;
      let groupRecipients: string[] = [];
      if (!lockTo) {
        for (const gid of selectedGroupIds) {
          try {
            const members = await groupApi.getGroupMembers(gid);
            groupRecipients.push(...members.map(m => m.email));
          } catch {}
        }
      }
      if (selfEmail) {
        groupRecipients = groupRecipients.filter(e => (e || "").trim().toLowerCase() !== selfEmail);
      }
      // Deduplicate
      const unique = Array.from(new Set([...typed, ...groupRecipients]));
      const forwardSuffix = forwardOf ? `\n\n---------- 转发的邮件 ---------\n发件人: ${forwardOf.from.name} <${forwardOf.from.email}>\n收件人: ${forwardOf.to.join(", ")}\n日期: ${new Date(forwardOf.date).toLocaleString()}\n主题: ${forwardOf.subject}\n\n${forwardOf.body}` : "";
      const finalBody = forwardSuffix ? `${body ? body + "\n\n" : ""}${forwardSuffix}` : body;
      onSend(unique, subject, finalBody, files);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop - Added z-0 to ensure it stays behind */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto z-0"
        onClick={onClose}
      />
      
      {/* Modal Content - Added relative and z-10 to sit above backdrop */}
      <div className="bg-white w-full sm:w-[600px] sm:h-[650px] h-[90%] sm:rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-slide-up sm:mb-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200 shrink-0">
          <h3 className="font-medium text-gray-700">新邮件</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          {isAdmin && !lockTo && (
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50 p-2 rounded-lg border border-blue-100 mb-2">
                  <input 
                    type="checkbox" 
                    id="broadcast" 
                    checked={isBroadcast} 
                    onChange={e => setIsBroadcast(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="broadcast" className="font-medium flex items-center gap-2 select-none cursor-pointer">
                      <Radio size={16} className="text-blue-500"/>
                      全员广播 (发送给所有用户)
                  </label>
              </div>
          )}

          {!isBroadcast && (
            <input
                type="text"
                placeholder="收件人"
                className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 bg-transparent"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={lockTo}
                readOnly={lockTo}
            />
          )}

          {!isBroadcast && !lockTo && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsGroupOpen(v => !v)}
                className="text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-200 flex items-center gap-2"
                title="选择群组"
              >
                <Users size={16} /> 选择群组
              </button>
              {selectedGroupIds.length > 0 && (
                <span className="text-xs text-gray-500">
                  已选择 {selectedGroupIds.length} 个群组
                </span>
              )}
            </div>
          )}

          {isGroupOpen && !isBroadcast && !lockTo && (
            <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
              {groups.length === 0 ? (
                <div className="text-sm text-gray-400">暂无可选群组</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groups.map(g => {
                    const checked = selectedGroupIds.includes(g.id);
                    return (
                      <label key={g.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${checked ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'} cursor-pointer`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedGroupIds(prev => e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id));
                          }}
                        />
                        <span className="text-sm text-gray-700 flex-1 truncate">{g.name}</span>
                        <span className="text-xs text-gray-400">成员 {g.memberCount}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="主题"
            className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 font-medium bg-transparent"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          {/* 移除 AI 辅助写作功能 */}

          <textarea
            className="flex-1 w-full resize-none focus:outline-none text-gray-700 leading-relaxed bg-transparent"
            placeholder="撰写邮件内容..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {forwardOf && (
            <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                转发的邮件
              </div>
              <div className="p-4 text-sm text-gray-700">
                <div className="text-gray-600 mb-3">
                  <div>发件人: {forwardOf.from.name} &lt;{forwardOf.from.email}&gt;</div>
                  <div>收件人: {forwardOf.to.join(", ") || "（无）"}</div>
                  <div>日期: {new Date(forwardOf.date).toLocaleString()}</div>
                  <div>主题: {forwardOf.subject || "（无主题）"}</div>
                </div>
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {forwardOf.body}
                </div>
              </div>
            </div>
          )}

          {/* Attachments List */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200">
                  <FileIcon size={14} className="text-gray-500" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button 
                    onClick={() => removeFile(idx)} 
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex gap-2 text-gray-400">
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="添加附件"
            >
              <Paperclip size={20} />
            </button>
            
          </div>
          <div className="flex gap-2">
            {onSaveDraft && (
                <button
                    onClick={() => onSaveDraft([to], subject, body)}
                    className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-colors border border-gray-300"
                >
                    <Save size={16} /> 保存草稿
                </button>
            )}
            <button
                onClick={handleSendClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                {isBroadcast ? '全员广播' : '发送'} <Send size={16} />
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};
