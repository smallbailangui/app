
import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { EmailList } from "./components/EmailList";
import { EmailDetail } from "./components/EmailDetail";
import { ComposeModal } from "./components/ComposeModal";
import { AuthPage } from "./pages/AuthPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminBlacklist } from "./pages/AdminBlacklist";
import { AdminGroups } from "./pages/AdminGroups";
import { AdminLogs } from "./pages/AdminLogs";
import { UserGroups } from "./pages/UserGroups";
import { SettingsPage } from "./pages/SettingsPage";
import { api } from "./api/api";
import { Email, Folder } from "./types/index";
import { AlertCircle, Loader2 } from "lucide-react";
import { ConfirmDialog } from "./components/ConfirmDialog";

// The InnerApp handles the routing logic once AuthProvider is set up
const InnerApp = () => {
  const { user, isLoading: authLoading, logout, isAdmin } = useAuth();
  
  // Navigation State
  const [currentView, setCurrentView] = useState<string>("inbox"); // 'inbox', 'dashboard', 'settings', etc.
  
  // Data State
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inboxUnreadCount, setInboxUnreadCount] = useState<number>(0);
  
  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<{id?: string, to: string, subject: string, body: string, lockTo?: boolean, forwardOf?: Email} | null>(null);
  const [confirmDeleteState, setConfirmDeleteState] = useState<{open: boolean, id: string | null}>({open: false, id: null});
  const [infoModal, setInfoModal] = useState<{open: boolean, title?: string, message: string} | null>(null);
  const [composeConfirm, setComposeConfirm] = useState<{open: boolean, title?: string, message: string, onConfirm: () => void} | null>(null);

  // Initial View Setup based on Role
  useEffect(() => {
    if (user) {
      if (isAdmin) setCurrentView("dashboard");
      else setCurrentView("inbox");
    }
  }, [user, isAdmin]);

  // Load emails when view changes to an email folder
  useEffect(() => {
    const isEmailFolder = ["inbox", "sent", "drafts", "junk", "trash", "starred"].includes(currentView);
    if (user && isEmailFolder) {
      loadEmails(currentView as Folder);
    }
  }, [currentView, user]);

  useEffect(() => {
    if (currentView !== "inbox") return;
    setInboxUnreadCount(emails.filter((e) => !e.isRead).length);
  }, [currentView, emails]);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const refreshInboxUnreadCount = async () => {
      if (currentView === "inbox") return;
      try {
        const inboxEmails = await api.getEmails("inbox");
        if (isCancelled) return;
        setInboxUnreadCount(inboxEmails.filter((e) => !e.isRead).length);
      } catch {}
    };

    refreshInboxUnreadCount();
    const intervalId = window.setInterval(refreshInboxUnreadCount, 15000);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, currentView]);

  const loadEmails = async (folder: Folder) => {
    setIsLoading(true);
    setSelectedEmail(null);
    setError(null);
    try {
      const data = await api.getEmails(folder);
      setEmails(data);
      if (folder === "inbox") {
        setInboxUnreadCount(data.filter((e) => !e.isRead).length);
      }
    } catch (err) {
      console.error("Error loading emails:", err);
      setError("无法连接到邮件服务器。");
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEmail = async (email: Email) => {
    // If selecting a draft, open compose modal instead of detail view
    if (currentView === 'drafts') {
        setComposeDraft({
            id: email.id,
            to: email.to.join(", "),
            subject: email.subject,
            body: email.body
        });
        setIsComposeOpen(true);
        // Optionally delete the old draft or keep it until sent. 
        // For this demo, we just open it.
        return;
    }

    setSelectedEmail(email);
    if (!email.isRead) {
      try {
        await api.markAsRead(email.id);
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
        );
      } catch (err) { console.error(err); }
    }
  };

  const formatQuote = (email: Email) => {
    return `\n\n在 ${new Date(email.date).toLocaleString()}, ${email.from.name} <${email.from.email}> 写道:\n> ${email.body.replace(/\n/g, "\n> ")}`;
  };

  const handleReply = (email: Email, suggestedBody?: string) => {
    setComposeDraft({
      to: email.from.email,
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: suggestedBody ?? "",
      lockTo: true
    });
    setIsComposeOpen(true);
  };

  const handleForward = (email: Email) => {
    setComposeDraft({
      to: "",
      subject: email.subject.startsWith("转发:") ? email.subject : `转发: ${email.subject}`,
      body: "",
      forwardOf: email
    });
    setIsComposeOpen(true);
  };

  const handleToggleStar = async (email: Email) => {
      const newStatus = !email.isStarred;
      // Optimistic update
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isStarred: newStatus } : e));
      if (selectedEmail?.id === email.id) {
          setSelectedEmail({ ...selectedEmail, isStarred: newStatus });
      }
      
      try {
          await api.toggleStar(email.id, newStatus);
          // If in starred folder and unstarred, refresh list
          if (currentView === 'starred' && !newStatus) {
              loadEmails('starred');
              if (selectedEmail?.id === email.id) setSelectedEmail(null);
          }
      } catch (e) {
          // Revert on error
          setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isStarred: !newStatus } : e));
      }
  };

  const handleSendEmail = async (to: string[], subject: string, body: string, files: File[]) => {
    let uploadedAttachments: any[] = [];
    if (files.length > 0) {
        console.log("Uploading files:", files.map(f => f.name));
        try {
            uploadedAttachments = await api.uploadAttachments(files);
        } catch (e) {
            console.error("Failed to upload attachments", e);
            setInfoModal({ open: true, title: "上传失败", message: "附件上传失败，请重试。" });
            return;
        }
    }
    
    const isBroadcast = to.length === 1 && to[0] === "ALL_USERS";
    const success = await api.sendEmail(to, subject, body, uploadedAttachments, isBroadcast);
    if (success) {
      // If it was a draft, delete the draft now that it's sent
      if (composeDraft?.id) {
        try {
            await api.deleteEmail(composeDraft.id);
            if(currentView === "drafts") loadEmails("drafts");
        } catch(e) {}
      }
      
      setIsComposeOpen(false);
      setComposeDraft(null);
      if (currentView === "sent") loadEmails("sent");
      setInfoModal({ open: true, title: "发送成功", message: files.length > 0 ? "邮件已发送（含附件）。" : "邮件已发送。" });
    } else {
      setInfoModal({ open: true, title: "发送失败", message: "请稍后重试或检查网络连接。" });
    }
  };

  const handleSaveDraft = async (to: string[], subject: string, body: string) => {
      // Logic for saving/updating draft.
      // For simplicity in mock, we always save as new for now (or api logic could be improved).
      // If we wanted to update, we'd need an updateDraft API method.
      // Here we just create a new one.
      const success = await api.saveDraft(to, subject, body);
      if(success) {
          setIsComposeOpen(false);
          setComposeDraft(null);
          if (currentView === "drafts") loadEmails("drafts");
      } else {
          setInfoModal({ open: true, title: "保存失败", message: "保存草稿失败，请稍后重试。" });
      }
  };

  const handleComposeDelete = async () => {
    const hasContent = !!(composeDraft?.to || composeDraft?.subject || composeDraft?.body);
    // Existing draft: confirm deletion
    if (composeDraft?.id) {
      setComposeConfirm({
        open: true,
        title: "删除草稿",
        message: "确定要删除此草稿吗？",
        onConfirm: async () => {
          try {
            await api.deleteEmail(composeDraft.id!);
            if (currentView === "drafts") loadEmails("drafts");
            setIsComposeOpen(false);
            setComposeDraft(null);
          } catch (e) {
            setInfoModal({ open: true, title: "删除失败", message: "删除草稿失败，请稍后再试。" });
          } finally {
            setComposeConfirm(null);
          }
        }
      });
      return;
    }
    // New compose: confirm discard if content exists, otherwise close directly
    if (hasContent) {
      setComposeConfirm({
        open: true,
        title: "放弃撰写",
        message: "放弃撰写此邮件？",
        onConfirm: () => {
          setIsComposeOpen(false);
          setComposeDraft(null);
          setComposeConfirm(null);
        }
      });
    } else {
      setIsComposeOpen(false);
      setComposeDraft(null);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteState({ open: true, id });
  };
  const confirmDelete = async () => {
    const id = confirmDeleteState.id;
    if (!id) return;
    await api.deleteEmail(id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmail?.id === id) setSelectedEmail(null);
    setConfirmDeleteState({ open: false, id: null });
  };
  const cancelDelete = () => setConfirmDeleteState({ open: false, id: null });

  // --- Render Logic ---

  if (authLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Determine what to render in the main content area
  const renderMainContent = () => {
    // Shared Pages
    if (currentView === "settings") return <SettingsPage />;

    // Admin Pages
    if (isAdmin) {
      if (currentView === "dashboard") return <AdminDashboard mode="dashboard" />;
      if (currentView === "users") return <AdminDashboard mode="users" />; 
      if (currentView === "blacklist") return <AdminBlacklist />;
      if (currentView === "groups") return <AdminGroups />;
      if (currentView === "logs") return <AdminLogs />;
    }
    
    // User Specific Pages
    if (!isAdmin) {
      if (currentView === "groups") return <UserGroups />;
    }

    // Email Pages (User & Admin)
    return (
      <div className="flex flex-1 flex-row overflow-hidden relative h-full">
         {error && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-red-50 text-red-600 px-4 py-2 text-sm flex items-center justify-center gap-2 border-b border-red-100">
                <AlertCircle size={16} />
                {error}
                <button onClick={() => loadEmails(currentView as Folder)} className="underline hover:text-red-800 ml-2">重试</button>
            </div>
        )}
        <EmailList
          currentFolder={currentView as Folder}
          emails={emails}
          selectedEmailId={selectedEmail?.id || null}
          isLoading={isLoading}
          onSelect={handleSelectEmail}
          onRefresh={() => loadEmails(currentView as Folder)}
          onToggleStar={handleToggleStar}
          onDelete={handleDelete}
        />
        <EmailDetail
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onDelete={handleDelete}
          onReply={handleReply}
          onForward={handleForward}
          onToggleStar={handleToggleStar}
        />
      </div>
    );
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <Sidebar
        role={user.role}
        currentView={currentView}
        onNavigate={setCurrentView}
        onCompose={() => { setComposeDraft(null); setIsComposeOpen(true); }}
        onLogout={logout}
        unreadCount={inboxUnreadCount}
      />
      
      {/* Main Layout Area */}
      <div className="flex-1 overflow-hidden h-full">
        {renderMainContent()}
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => { setIsComposeOpen(false); setComposeDraft(null); }}
        onSend={handleSendEmail}
        onSaveDraft={handleSaveDraft}
        onDelete={handleComposeDelete}
        initialTo={composeDraft?.to}
        initialSubject={composeDraft?.subject}
        initialBody={composeDraft?.body}
        lockTo={composeDraft?.lockTo}
        forwardOf={composeDraft?.forwardOf}
      />
      {composeConfirm?.open && (
        <ConfirmDialog
          open={true}
          title={composeConfirm.title}
          message={composeConfirm.message}
          confirmText="确认"
          cancelText="取消"
          onConfirm={composeConfirm.onConfirm}
          onCancel={() => setComposeConfirm(null)}
        />
      )}
      <ConfirmDialog
        open={confirmDeleteState.open}
        title="删除邮件"
        message="确定要删除这封邮件吗？"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
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

// Root App Component wraps everything in Providers
const App = () => {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
};

export default App;
