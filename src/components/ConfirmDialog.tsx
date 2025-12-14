import React from "react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl border border-gray-200 w-[92%] max-w-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-gray-800 font-semibold text-base">{title}</h3>
        </div>
        <div className="p-4 text-sm text-gray-700 leading-relaxed">
          {message}
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-white">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

