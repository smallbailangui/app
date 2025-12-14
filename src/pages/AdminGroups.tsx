
import React, { useState, useEffect } from "react";
import { Group as GroupIcon, Plus, Trash2, Users, X, UserPlus } from "lucide-react";
import { adminApi } from "../api/api";
import { Group, GroupMember } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";

export const AdminGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  
  // New Group Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [infoModal, setInfoModal] = useState<{open: boolean, title?: string, message: string} | null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getGroups();
      setGroups(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const success = await adminApi.createGroup(name, description);
      if (success) {
        setShowCreateModal(false);
        setName("");
        setDescription("");
        loadGroups();
      } else {
        setInfoModal({ open: true, title: "创建失败", message: "创建群组失败。" });
      }
    } catch(e) { setInfoModal({ open: true, title: "错误", message: "创建群组出错。" }); }
  };

  const handleDelete = async (id: number) => {
    setConfirmState({
      open: true,
      title: "删除群组",
      message: "确定要删除此群组？",
      onConfirm: async () => {
        try {
          await adminApi.deleteGroup(id);
          setGroups(groups.filter(g => g.id !== id));
        } catch(e) { setInfoModal({ open: true, title: "删除失败", message: "删除群组失败。" }); }
        setConfirmState(null);
      }
    });
  };

  // --- Member Management ---

  const openMembers = async (group: Group) => {
    setSelectedGroup(group);
    const data = await adminApi.getGroupMembers(group.id);
    setMembers(data);
  };

  const closeMembers = () => {
    setSelectedGroup(null);
    setMembers([]);
    setNewMemberEmail("");
  };

  const handleAddMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedGroup || !newMemberEmail) return;
      try {
          const success = await adminApi.addGroupMember(selectedGroup.id, newMemberEmail);
          if(success) {
              setNewMemberEmail("");
              const data = await adminApi.getGroupMembers(selectedGroup.id);
              setMembers(data);
              // Optimistically update count
              setGroups(groups.map(g => g.id === selectedGroup.id ? {...g, memberCount: g.memberCount + 1} : g));
          } else {
              setInfoModal({ open: true, title: "添加失败", message: "添加成员失败（用户可能不存在）。" });
          }
      } catch(e) { setInfoModal({ open: true, title: "错误", message: "添加成员出错。" }); }
  };

  const handleRemoveMember = async (accountId: number) => {
      if(!selectedGroup) return;
      setConfirmState({
        open: true,
        title: "移除成员",
        message: "从群组移除该用户？",
        onConfirm: async () => {
          try {
              await adminApi.removeGroupMember(selectedGroup.id!, accountId);
              setMembers(members.filter(m => m.accountId !== accountId));
              setGroups(groups.map(g => g.id === selectedGroup.id ? {...g, memberCount: g.memberCount - 1} : g));
          } catch(e) { setInfoModal({ open: true, title: "移除失败", message: "移除成员失败。" }); }
          setConfirmState(null);
        }
      });
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto p-8 h-full relative">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GroupIcon className="text-blue-600" /> 用户群组
            </h1>
            <p className="text-gray-500">将用户组织到部门或团队中。</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <Plus size={18} /> 新建群组
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
                <div key={group.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <GroupIcon size={24} />
                        </div>
                        <button onClick={() => handleDelete(group.id)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{group.name}</h3>
                    <p className="text-gray-500 text-sm mb-4 h-10 line-clamp-2">{group.description || "无描述。"}</p>
                    
                    <button 
                        onClick={() => openMembers(group)}
                        className="w-full pt-4 border-t border-gray-100 flex items-center justify-between text-sm hover:bg-gray-50 transition-colors -mx-6 px-6 -mb-6 py-4 rounded-b-xl"
                    >
                        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                            <Users size={16} /> 管理成员 ({group.memberCount})
                        </span>
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-slide-up">
                    <h2 className="text-xl font-bold mb-4">创建新群组</h2>
                    <form onSubmit={handleCreate}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
                            <input 
                                autoFocus
                                type="text" 
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                取消
                            </button>
                            <button 
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                创建群组
                            </button>
                        </div>
                    </form>
                </div>
            </div>
      )}

      {/* Members Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-slide-up">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedGroup.name} 成员</h2>
                        <p className="text-sm text-gray-500">管理该群组成员</p>
                    </div>
                    <button onClick={closeMembers} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                     <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
                        <input 
                            type="text"
                            placeholder="通过邮箱添加用户..." 
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newMemberEmail}
                            onChange={e => setNewMemberEmail(e.target.value)}
                        />
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <UserPlus size={18} /> 添加
                        </button>
                     </form>

                     {members.length === 0 ? (
                         <div className="text-center py-8 text-gray-400">群组暂无成员。</div>
                     ) : (
                         <table className="w-full text-left text-sm">
                             <thead className="text-gray-500 bg-gray-50">
                                 <tr>
                                     <th className="px-4 py-2 rounded-l-lg">用户</th>
                                     <th className="px-4 py-2">邮箱</th>
                                     <th className="px-4 py-2 rounded-r-lg text-right">操作</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {members.map(m => (
                                     <tr key={m.id}>
                                         <td className="px-4 py-3 font-medium text-gray-900">{m.username}</td>
                                         <td className="px-4 py-3 text-gray-500">{m.email}</td>
                                         <td className="px-4 py-3 text-right">
                                             <button onClick={() => handleRemoveMember(m.accountId)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                                                 <Trash2 size={16} />
                                             </button>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     )}
                </div>
            </div>
        </div>
      )}
      
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
    </div>
  );
};
