
import React, { useState, useEffect } from "react";
import { Group as GroupIcon, Users, Search, LogOut, Plus, Settings, Trash2, Edit2, X, UserPlus, Save } from "lucide-react";
import { groupApi } from "../api/api";
import { Group, GroupMember } from "../types";

export const UserGroups = () => {
  const [activeTab, setActiveTab] = useState<"joined" | "managed" | "explore">("joined");
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [managedGroups, setManagedGroups] = useState<Group[]>([]);
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [managingGroup, setManagingGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  useEffect(() => {
    if (activeTab === "joined") loadJoinedGroups();
    if (activeTab === "managed") loadManagedGroups();
  }, [activeTab]);

  const loadJoinedGroups = async () => {
    setLoading(true);
    try {
      const data = await groupApi.getJoinedGroups();
      setJoinedGroups(data);
    } finally { setLoading(false); }
  };

  const loadManagedGroups = async () => {
    setLoading(true);
    try {
      const data = await groupApi.getManagedGroups();
      setManagedGroups(data);
    } finally { setLoading(false); }
  };

  // --- CRUD Operations ---

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    try {
      await groupApi.createGroup(formName, formDesc);
      setShowCreateModal(false);
      setFormName("");
      setFormDesc("");
      loadManagedGroups();
    } catch(e) { alert("创建群组失败"); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !formName.trim()) return;
    try {
      await groupApi.updateGroup(editingGroup.id, formName, formDesc);
      setEditingGroup(null);
      setFormName("");
      setFormDesc("");
      loadManagedGroups();
    } catch(e) { alert("更新群组失败"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除此群组吗？")) return;
    try {
      await groupApi.deleteGroup(id);
      loadManagedGroups();
    } catch(e) { alert("删除群组失败"); }
  };

  // --- Membership Logic (User Managed Groups) ---
  
  const openManageModal = async (group: Group) => {
    setManagingGroup(group);
    const data = await groupApi.getGroupMembers(group.id);
    setMembers(data);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!managingGroup || !newMemberEmail) return;
    try {
        const success = await groupApi.addGroupMember(managingGroup.id, newMemberEmail);
        if(success) {
            setNewMemberEmail("");
            const data = await groupApi.getGroupMembers(managingGroup.id);
            setMembers(data);
            // Refresh main list to update count
            loadManagedGroups(); 
        } else {
            alert("添加成员失败");
        }
    } catch(e) { alert("添加成员时出错"); }
  };

  const handleRemoveMember = async (accountId: number) => {
    if(!managingGroup || !confirm("确定移除该用户？")) return;
    try {
        await groupApi.removeGroupMember(managingGroup.id, accountId);
        setMembers(members.filter(m => m.accountId !== accountId));
        loadManagedGroups();
    } catch(e) { alert("移除成员失败"); }
  };

  // --- Explore / Join Logic ---

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await groupApi.searchGroups(searchQuery);
      setSearchResults(results);
    } finally { setLoading(false); }
  };

  const handleJoin = async (group: Group) => {
    if(!confirm(`加入 ${group.name}?`)) return;
    try {
      await groupApi.joinGroup(group.id);
      alert("加入成功！");
      if(activeTab === "joined") loadJoinedGroups();
    } catch(e) { alert("加入群组失败"); }
  };

  const handleLeave = async (group: Group) => {
    if(!confirm(`退出 ${group.name}?`)) return;
    try {
      await groupApi.leaveGroup(group.id);
      setJoinedGroups(joinedGroups.filter(g => g.id !== group.id));
    } catch(e) { alert("退出群组失败"); }
  };

  // --- UI Components ---

  const ManagedGroupCard = ({ group }: { group: Group }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group relative">
       <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
          <Settings size={24} />
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                onClick={() => { setEditingGroup(group); setFormName(group.name); setFormDesc(group.description); }}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg"
            >
                <Edit2 size={16} />
            </button>
            <button 
                onClick={() => handleDelete(group.id)}
                className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
            >
                <Trash2 size={16} />
            </button>
        </div>
      </div>
      <h3 className="font-bold text-lg text-gray-900 mb-1">{group.name}</h3>
      <p className="text-gray-500 text-sm mb-4 h-10 line-clamp-2">{group.description || "无描述。 "}</p>
      
      <button 
        onClick={() => openManageModal(group)}
        className="w-full pt-4 border-t border-gray-100 flex items-center justify-between text-sm hover:bg-gray-50 transition-colors -mx-6 px-6 -mb-6 py-4 rounded-b-xl"
      >
        <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
          <Users size={16} /> 管理成员 ({group.memberCount})
        </span>
      </button>
    </div>
  );

  const GroupCard = ({ group, isMember }: { group: Group, isMember: boolean }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <GroupIcon size={24} />
        </div>
        {isMember ? (
          <button 
            onClick={() => handleLeave(group)}
            className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="退出群组"
          >
            <LogOut size={18} />
          </button>
        ) : (
          <button 
            onClick={() => handleJoin(group)}
            className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            加入
          </button>
        )}
      </div>
      <h3 className="font-bold text-lg text-gray-900 mb-1">{group.name}</h3>
      <p className="text-gray-500 text-sm mb-4 h-10 line-clamp-2">{group.description || "无描述。"}</p>
      
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-600">
          <Users size={16} /> {group.memberCount} 成员
        </span>
        <span className="text-gray-400 text-xs">
          创建于 {new Date(group.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto p-8 h-full">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">群组</h1>
                <p className="text-gray-500">管理您的团队成员资格并发现新群组。</p>
            </div>
            {activeTab === 'managed' && (
                <button 
                    onClick={() => { setFormName(""); setFormDesc(""); setShowCreateModal(true); }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
                >
                    <Plus size={18} /> 创建群组
                </button>
            )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("joined")}
            className={`pb-4 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "joined" 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            我加入的群组
          </button>
          <button
            onClick={() => setActiveTab("managed")}
            className={`pb-4 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "managed" 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            我管理的群组
          </button>
          <button
            onClick={() => { setActiveTab("explore"); setSearchResults([]); setSearchQuery(""); }}
            className={`pb-4 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "explore" 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            发现
          </button>
        </div>

        {/* Content Area */}
        {activeTab === "joined" && (
             loading ? <div className="text-center py-12 text-gray-400">加载中...</div> :
             joinedGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>您尚未加入任何群组。</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {joinedGroups.map(group => <GroupCard key={group.id} group={group} isMember={true} />)}
                </div>
             )
        )}

        {activeTab === "managed" && (
             loading ? <div className="text-center py-12 text-gray-400">加载中...</div> :
             managedGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Settings size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>您没有管理任何群组。</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {managedGroups.map(group => <ManagedGroupCard key={group.id} group={group} />)}
                </div>
             )
        )}

        {activeTab === "explore" && (
            <div>
                 <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                     <div className="flex-1 relative">
                         <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                         <input 
                             type="text" 
                             placeholder="搜索群组..."
                             className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                         />
                     </div>
                     <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium">搜索</button>
                 </form>
                 {searchResults.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {searchResults.map(group => <GroupCard key={group.id} group={group} isMember={false} />)}
                     </div>
                 ) : searchQuery && !loading && (
                     <div className="text-center py-12 text-gray-400">未找到群组。</div>
                 )}
            </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showCreateModal || editingGroup) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-slide-up">
                <h2 className="text-xl font-bold mb-4">{editingGroup ? '编辑群组' : '创建新群组'}</h2>
                <form onSubmit={editingGroup ? handleUpdate : handleCreate}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">群组名称</label>
                        <input 
                            autoFocus
                            type="text" 
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                            value={formDesc}
                            onChange={e => setFormDesc(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => { setShowCreateModal(false); setEditingGroup(null); }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            取消
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                        >
                            {editingGroup ? <Save size={16}/> : <Plus size={16}/>}
                            {editingGroup ? '保存更改' : '创建群组'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Members Modal */}
      {managingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-slide-up">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{managingGroup.name} 成员</h2>
                        <p className="text-sm text-gray-500">管理此群组的成员</p>
                    </div>
                    <button onClick={() => { setManagingGroup(null); setMembers([]); }} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                     <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
                        <input 
                            type="text"
                            placeholder="通过邮箱添加用户..." 
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newMemberEmail}
                            onChange={e => setNewMemberEmail(e.target.value)}
                        />
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <UserPlus size={18} /> 添加
                        </button>
                     </form>

                     {members.length === 0 ? (
                         <div className="text-center py-8 text-gray-400">群组内暂无成员。</div>
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
    </div>
  );
};
