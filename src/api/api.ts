
import { Email, Folder, User, AdminUserSummary, BlacklistItem, Group, EmailQueueItem, GroupMember, ServerConfig, LogEntry } from "../types";

// --- Configuration ---
const USE_MOCK_DATA = true; 
const API_BASE_URL = "http://localhost:8080/api";

// --- Auth State Management ---
let authToken = localStorage.getItem("auth_token");
let cachedUser: User | null = null;

// Helper to decode token or get mock user
const getUserFromToken = (token: string): User | null => {
  if (USE_MOCK_DATA) {
    const isAdmin = token.includes("admin");
    return {
      id: isAdmin ? "1" : "999", // Fixed IDs for mock stability
      name: isAdmin ? "管理员" : "演示用户",
      email: isAdmin ? "admin@mailai.com" : "user@mailai.com",
      role: isAdmin ? "ADMIN" : "USER",
      signature: "由 MailAI 发送"
    };
  }
  return cachedUser;
};

// --- Shared Mock Data ---
let MOCK_GROUPS: Group[] = [
    { id: 1, ownerId: "1", name: "开发组", description: "技术研发团队", memberCount: 5, createdAt: new Date().toISOString() },
    { id: 2, ownerId: "1", name: "市场部", description: "销售与推广", memberCount: 12, createdAt: new Date().toISOString() },
    { id: 3, ownerId: "999", name: "我的项目组", description: "内部项目讨论", memberCount: 3, createdAt: new Date().toISOString() }
];

let MOCK_GROUP_MEMBERS: Record<number, GroupMember[]> = {
    1: [
         { id: 1, accountId: 101, username: "dev_lead", email: "lead@dev.com", joinedAt: new Date().toISOString() },
         { id: 2, accountId: 102, username: "junior_dev", email: "jr@dev.com", joinedAt: new Date().toISOString() }
    ],
    3: [
         { id: 3, accountId: 103, username: "partner", email: "partner@work.com", joinedAt: new Date().toISOString() }
    ]
};

let MOCK_SERVER_CONFIG: ServerConfig = {
    smtpPort: 25,
    pop3Port: 110,
    domain: "mail.test.com",
    smtpEnabled: true,
    pop3Enabled: true
};

let MOCK_LOGS: LogEntry[] = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    timestamp: new Date(Date.now() - i * 60000 * 5).toISOString(),
    service: i % 3 === 0 ? "SMTP" : i % 3 === 1 ? "POP3" : "SYSTEM",
    level: i % 10 === 0 ? "ERROR" : i % 5 === 0 ? "WARN" : "INFO",
    message: i % 3 === 0 
        ? `Received connection from 192.168.1.${100+i}` 
        : i % 3 === 1 
        ? `User authentication successful: user${i}` 
        : `System backup completed`
}));

let MOCK_USERS: AdminUserSummary[] = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  username: `用户${i}`,
  email: `user${i}@example.com`,
  enabled: i % 5 !== 0,
  lastLogin: new Date().toISOString(),
  quotaLimit: 1000,
  usedSpace: Math.random() * 500
}));

export const authApi = {
  isAuthenticated: () => !!authToken,
  getToken: () => authToken,
  
  getCurrentUser: async (): Promise<User | null> => {
    if (!authToken) return null;
    if (USE_MOCK_DATA) return getUserFromToken(authToken);
    try {
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
      });
      const json = await res.json();
      if (json && json.success && json.data) {
        const a = json.data;
        const u: User = {
          id: String(a.id ?? ""),
          name: a.username ?? "",
          email: a.email ?? "",
          role: a.isAdmin ? "ADMIN" : "USER",
          signature: a.signature ?? ""
        };
        cachedUser = u;
        return u;
      }
      return null;
    } catch {
      return null;
    }
  },

  async login(identifier: string, password: string): Promise<User | null> {
    if (USE_MOCK_DATA) {
      if (identifier && password) {
        const isAdmin = identifier.toLowerCase().includes("admin");
        const mockToken = `mock_token_${isAdmin ? 'admin' : 'user'}_` + Date.now();
        authToken = mockToken;
        localStorage.setItem("auth_token", mockToken);
        const user = getUserFromToken(mockToken);
        cachedUser = user;
        return user;
      }
      throw new Error("凭据无效");
    }
    // ... Real implementation ...
    return null;
  },

  async register(email: string, password: string): Promise<boolean> {
    if (USE_MOCK_DATA) return true;
    // ... Real implementation ...
    return true;
  },

  logout() {
    if (!USE_MOCK_DATA && authToken) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(() => {});
    }
    authToken = null;
    cachedUser = null;
    localStorage.removeItem("auth_token");
  }
};

// --- User Settings API ---
export const userApi = {
  async updateProfile(name: string, signature: string): Promise<boolean> {
    if(USE_MOCK_DATA) {
      if(cachedUser) {
        cachedUser = { ...cachedUser, name, signature };
      }
      return true;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken ? `Bearer ${authToken}` : ""
        },
        body: JSON.stringify({ username: name, signature })
      });
      const json = await res.json();
      return !!json?.success;
    } catch {
      return false;
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if(USE_MOCK_DATA) return true;
    try {
      const res = await fetch(`${API_BASE_URL}/users/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken ? `Bearer ${authToken}` : ""
        },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword: newPassword })
      });
      const json = await res.json();
      return !!json?.success;
    } catch {
      return false;
    }
  }
};

// --- User Groups API ---
export const groupApi = {
    async getJoinedGroups(): Promise<Group[]> {
        if(USE_MOCK_DATA) return MOCK_GROUPS.slice(0, 2);
        return [];
    },
    async getManagedGroups(): Promise<Group[]> {
      if (USE_MOCK_DATA) {
        const user = await authApi.getCurrentUser();
        return MOCK_GROUPS.filter(g => g.ownerId === user?.id);
      }
      return [];
    },
    async searchGroups(query: string): Promise<Group[]> {
        if(USE_MOCK_DATA) return MOCK_GROUPS.filter(g => g.name.toLowerCase().includes(query.toLowerCase()));
        return [];
    },
    async getGroupMembers(groupId: number): Promise<GroupMember[]> {
      if(USE_MOCK_DATA) return MOCK_GROUP_MEMBERS[groupId] || [];
      return [];
    },
    async createGroup(name: string, description: string): Promise<boolean> {
      if (USE_MOCK_DATA) {
        const user = await authApi.getCurrentUser();
        const newGroup: Group = {
          id: Date.now(),
          ownerId: user?.id || "0",
          name,
          description,
          memberCount: 1,
          createdAt: new Date().toISOString()
        };
        MOCK_GROUPS.push(newGroup);
        return true;
      }
      return true;
    },
    async updateGroup(groupId: number, name: string, description: string): Promise<boolean> {
      if(USE_MOCK_DATA) {
        MOCK_GROUPS = MOCK_GROUPS.map(g => g.id === groupId ? { ...g, name, description } : g);
        return true;
      }
      return true;
    },
    async deleteGroup(id: number): Promise<void> {
      if(USE_MOCK_DATA) {
        MOCK_GROUPS = MOCK_GROUPS.filter(g => g.id !== id);
      }
    },
    async joinGroup(groupId: number): Promise<boolean> { return true; },
    async leaveGroup(groupId: number): Promise<void> {},
    async addGroupMember(groupId: number, email: string): Promise<boolean> {
      if(USE_MOCK_DATA) {
        const members = MOCK_GROUP_MEMBERS[groupId] || [];
        members.push({
           id: Date.now(),
           accountId: Math.floor(Math.random() * 1000),
           username: email.split('@')[0],
           email: email,
           joinedAt: new Date().toISOString()
        });
        MOCK_GROUP_MEMBERS[groupId] = members;
        const groupIndex = MOCK_GROUPS.findIndex(g => g.id === groupId);
        if (groupIndex > -1) MOCK_GROUPS[groupIndex].memberCount += 1;
        return true;
      }
      return true;
    },
    async removeGroupMember(groupId: number, accountId: number): Promise<void> {
     if(USE_MOCK_DATA) {
       const members = MOCK_GROUP_MEMBERS[groupId] || [];
       MOCK_GROUP_MEMBERS[groupId] = members.filter(m => m.accountId !== accountId);
       const groupIndex = MOCK_GROUPS.findIndex(g => g.id === groupId);
       if (groupIndex > -1) MOCK_GROUPS[groupIndex].memberCount = Math.max(0, MOCK_GROUPS[groupIndex].memberCount - 1);
     }
   },
};

// --- Admin API ---
export const adminApi = {
  // Users
  async getUsers(page = 0, size = 20): Promise<AdminUserSummary[]> {
    if (USE_MOCK_DATA) {
      await new Promise(r => setTimeout(r, 500));
      return [...MOCK_USERS];
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users?page=${page}&size=${size}`, {
        headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
      });
      const json = await res.json();
      const content = json?.data?.content ?? [];
      return content.map((a: any) => ({
        id: a.id ?? 0,
        username: a.username ?? "",
        email: a.email ?? "",
        enabled: !!a.enabled,
        lastLogin: a.lastLogin ?? "",
        quotaLimit: Number(a.quotaLimit ?? 0),
        usedSpace: Number(a.usedSpace ?? 0)
      })) as AdminUserSummary[];
    } catch {
      return [];
    }
  },

  async toggleUserStatus(id: number, enabled: boolean): Promise<void> {
    if (USE_MOCK_DATA) {
      MOCK_USERS = MOCK_USERS.map(u => u.id === id ? { ...u, enabled } : u);
      return;
    }
    await fetch(`${API_BASE_URL}/admin/users/${id}/status?enabled=${enabled}`, {
      method: "PUT",
      headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
    });
  },
  async deleteUser(id: number): Promise<void> {
    if (USE_MOCK_DATA) {
      MOCK_USERS = MOCK_USERS.filter(u => u.id !== id);
      return;
    }
    throw new Error("删除用户接口未在 api-docs 中定义");
  },

  // Blacklist
  async getBlacklist(): Promise<BlacklistItem[]> {
    if (USE_MOCK_DATA) {
        return [
            { id: 1, type: "IP", value: "192.168.1.55", createdAt: new Date().toISOString() },
            { id: 2, type: "EMAIL", value: "spammer@bad.com", createdAt: new Date().toISOString() }
        ];
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/blacklist`, {
        headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
      });
      const json = await res.json();
      return (json?.data ?? []) as BlacklistItem[];
    } catch {
      return [];
    }
  },
  async addToBlacklist(type: "IP" | "EMAIL", value: string): Promise<BlacklistItem | null> {
    if (USE_MOCK_DATA) return { id: Date.now(), type, value, createdAt: new Date().toISOString() };
    try {
      const res = await fetch(`${API_BASE_URL}/admin/blacklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken ? `Bearer ${authToken}` : ""
        },
        body: JSON.stringify({ type, value })
      });
      const json = await res.json();
      return (json?.data ?? null) as BlacklistItem | null;
    } catch {
      return null;
    }
  },
  async removeFromBlacklist(id: number): Promise<void> {
    if (USE_MOCK_DATA) return;
    await fetch(`${API_BASE_URL}/admin/blacklist/${id}`, {
      method: "DELETE",
      headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
    });
  },

  // Groups (Admin)
  async getGroups(): Promise<Group[]> { return groupApi.searchGroups(""); },
  async createGroup(name: string, description: string): Promise<boolean> { return groupApi.createGroup(name, description); },
  async deleteGroup(id: number): Promise<void> { return groupApi.deleteGroup(id); },
  async getGroupMembers(groupId: number): Promise<GroupMember[]> { return groupApi.getGroupMembers(groupId); },
  async addGroupMember(groupId: number, email: string): Promise<boolean> { return groupApi.addGroupMember(groupId, email); },
  async removeGroupMember(groupId: number, accountId: number): Promise<void> { return groupApi.removeGroupMember(groupId, accountId); },

  // Queue
  async getQueueStatus(): Promise<EmailQueueItem[]> {
      if (USE_MOCK_DATA) {
          return [
              { id: 101, emailId: 50, errorMessage: "连接超时", retryCount: 1, status: "FAILED", nextRetryTime: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
              { id: 102, emailId: 51, errorMessage: "", retryCount: 0, status: "PROCESSING", nextRetryTime: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          ];
      }
      try {
        const res = await fetch(`${API_BASE_URL}/queue/status`, {
          headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
        });
        const json = await res.json();
        return (json?.data ?? []) as EmailQueueItem[];
      } catch {
        return [];
      }
  },
  async processQueue(): Promise<void> {
    if (USE_MOCK_DATA) return;
    await fetch(`${API_BASE_URL}/queue/process`, {
      method: "POST",
      headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
    });
  },
  async resendQueueItem(queueId: number): Promise<void> {
    if (USE_MOCK_DATA) return;
    await fetch(`${API_BASE_URL}/queue/resend/${queueId}`, {
      method: "POST",
      headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
    });
  },
  async clearQueue(): Promise<void> {
    if (USE_MOCK_DATA) return;
    await fetch(`${API_BASE_URL}/queue/clear`, {
      method: "DELETE",
      headers: { Authorization: authToken ? `Bearer ${authToken}` : "" }
    });
  },

  // Server Config & Logs
  async getServerConfig(): Promise<ServerConfig> {
      if(USE_MOCK_DATA) return { ...MOCK_SERVER_CONFIG };
      return MOCK_SERVER_CONFIG;
  },
  async updateServerConfig(config: ServerConfig): Promise<boolean> {
      if(USE_MOCK_DATA) {
          MOCK_SERVER_CONFIG = config;
          return true;
      }
      return true;
  },
  async getLogs(): Promise<LogEntry[]> {
      if(USE_MOCK_DATA) return [...MOCK_LOGS];
      return [];
  },
  async clearLogs(): Promise<void> {
      if(USE_MOCK_DATA) MOCK_LOGS = [];
  }
};

// --- Email Service ---
export interface IEmailService {
  getEmails(folder: Folder): Promise<Email[]>;
  getEmail(id: string): Promise<Email | undefined>;
  sendEmail(to: string[], subject: string, body: string, isBroadcast?: boolean): Promise<boolean>; // Updated
  saveDraft(to: string[], subject: string, body: string): Promise<boolean>;
  markAsRead(id: string): Promise<void>;
  toggleStar(id: string, isStarred: boolean): Promise<void>;
  deleteEmail(id: string): Promise<void>;
}

class RealEmailService implements IEmailService {
  async getEmails(folder: Folder): Promise<Email[]> { return []; }
  async getEmail(id: string): Promise<Email | undefined> { return undefined; }
  async sendEmail(to: string[], subject: string, body: string): Promise<boolean> { return true; }
  async saveDraft(to: string[], subject: string, body: string): Promise<boolean> { return true; }
  async markAsRead(id: string): Promise<void> {}
  async toggleStar(id: string, isStarred: boolean): Promise<void> {}
  async deleteEmail(id: string): Promise<void> {}
}

const MOCK_EMAILS: Email[] = [
  {
    id: "1",
    folder: "inbox",
    from: { name: "系统管理员", email: "admin@mailai.com" },
    to: ["user@example.com"],
    subject: "欢迎使用新版本",
    body: "我们更新了系统布局。管理员用户现在拥有了仪表盘。\n\n请尽情体验！",
    snippet: "我们更新了系统布局...",
    date: new Date().toISOString(),
    isRead: false,
    isStarred: true,
  },
  {
      id: "2",
      folder: "drafts",
      from: { name: "我", email: "me@mailai.com" },
      to: ["boss@company.com"],
      subject: "关于下周的项目计划",
      body: "老板你好，\n\n这是下周的项目草案...",
      snippet: "老板你好，这是下周的项目草案...",
      date: new Date(Date.now() - 86400000).toISOString(),
      isRead: true,
      isStarred: false,
  }
];

class MockEmailService implements IEmailService {
  private emails: Email[] = [...MOCK_EMAILS];
  
  async getEmails(folder: Folder): Promise<Email[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (folder === 'starred') return this.emails.filter((e) => e.isStarred);
    return this.emails.filter((e) => e.folder === folder);
  }
  
  async getEmail(id: string): Promise<Email | undefined> {
    return this.emails.find((e) => e.id === id);
  }
  
  async sendEmail(to: string[], subject: string, body: string, isBroadcast?: boolean): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Simulate adding to sent
    this.emails.unshift({
        id: Date.now().toString(),
        folder: "sent",
        from: { name: "我", email: "me@demo.com" },
        to: isBroadcast ? ["所有用户"] : to,
        subject: isBroadcast ? `[公告] ${subject}` : subject,
        body: body,
        snippet: body.substring(0, 50),
        date: new Date().toISOString(),
        isRead: true,
        isStarred: false
    });
    return true;
  }

  async saveDraft(to: string[], subject: string, body: string): Promise<boolean> {
      await new Promise((resolve) => setTimeout(resolve, 400));
      this.emails.unshift({
          id: Date.now().toString(),
          folder: "drafts",
          from: { name: "我", email: "me@demo.com" },
          to: to,
          subject: subject || "(无主题)",
          body: body,
          snippet: body.substring(0, 50) || "...",
          date: new Date().toISOString(),
          isRead: true,
          isStarred: false
      });
      return true;
  }

  async markAsRead(id: string): Promise<void> {
      const email = this.emails.find(e => e.id === id);
      if (email) email.isRead = true;
  }

  async toggleStar(id: string, isStarred: boolean): Promise<void> {
      const email = this.emails.find(e => e.id === id);
      if (email) email.isStarred = isStarred;
  }

  async deleteEmail(id: string): Promise<void> {
      const email = this.emails.find(e => e.id === id);
      if(email) {
          if(email.folder === 'trash') {
             this.emails = this.emails.filter(e => e.id !== id);
          } else {
             email.folder = 'trash';
          }
      }
  }
}

export const api = USE_MOCK_DATA ? new MockEmailService() : new RealEmailService();
