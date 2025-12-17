
import React, { useState, useEffect } from "react";
import { Ban, Trash2, Plus, AlertTriangle, Shield } from "lucide-react";
import { adminApi } from "../api/api";
import { BlacklistItem } from "../types";
import { ConfirmDialog } from "../components/ConfirmDialog";

export const AdminBlacklist = () => {
  const [list, setList] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemType, setNewItemType] = useState<"IP" | "EMAIL">("EMAIL");
  const [newItemValue, setNewItemValue] = useState("");
  const [infoModal, setInfoModal] = useState<{open: boolean, title?: string, message: string} | null>(null);
  const [confirmState, setConfirmState] = useState<{open: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getBlacklist();
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemValue.trim()) return;

    try {
      const added = await adminApi.addToBlacklist(newItemType, newItemValue);
      if (added) {
        setList((prev) => [...prev, added]);
        setNewItemValue("");
      } else {
        setInfoModal({ open: true, title: "添加失败", message: "添加到黑名单失败。" });
      }
    } catch (e) {
      setInfoModal({ open: true, title: "添加失败", message: e instanceof Error ? e.message : "添加条目出错。" });
    }
  };

  const handleRemove = async (id: number) => {
    setConfirmState({
      open: true,
      title: "移除规则",
      message: "移除此规则？",
      onConfirm: async () => {
        try {
          await adminApi.removeFromBlacklist(id);
          setList(list.filter((item) => item.id !== id));
        } catch (e) {
          setInfoModal({ open: true, title: "移除失败", message: "移除条目失败。" });
        }
        setConfirmState(null);
      }
    });
  };

  return (
    <>
    <div className="flex-1 bg-gray-50 overflow-y-auto p-8 h-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ban className="text-red-600" /> 黑名单管理
          </h1>
          <p className="text-gray-500">阻止特定 IP 或邮箱地址访问系统。</p>
        </div>

        {/* Add Form */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <h3 className="font-medium text-gray-800 mb-4">添加新规则</h3>
          <form onSubmit={handleAdd} className="flex gap-4 items-end">
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">类型</label>
              <select
                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={newItemType}
                onChange={(e) => setNewItemType(e.target.value as "IP" | "EMAIL")}
              >
                <option value="EMAIL">邮箱</option>
                <option value="IP">IP 地址</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">值</label>
              <input
                type="text"
                placeholder={newItemType === "EMAIL" ? "spammer@bad.com" : "192.168.x.x"}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
            >
              <Plus size={16} /> 添加封禁
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {list.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Shield size={48} className="mx-auto mb-4 text-green-200" />
              <p>暂无黑名单规则。系统开放。</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3 w-32">类型</th>
                  <th className="px-6 py-3">值</th>
                  <th className="px-6 py-3">创建时间</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30">
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        item.type === "IP" ? "bg-gray-200 text-gray-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700">{item.value}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
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
