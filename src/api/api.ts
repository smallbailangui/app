
import { Email, Folder, User, AdminUserSummary, BlacklistItem, Group, EmailQueueItem, GroupMember, ServerConfig, LogEntry, Attachment } from "../types";

// --- Configuration ---
const USE_MOCK_DATA = false; 
const API_BASE_URL = "http://localhost:8000/api";

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
  lastLogin: new Date().toISOString()
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
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });
      
      if (!res.ok) {
        let errorMessage = `请求失败: ${res.status}`;
        try {
            const errorJson = await res.json();
            errorMessage = errorJson.message || errorMessage;
        } catch {
            // If response is not JSON (e.g. 500 HTML page), use generic message
            errorMessage = `服务器连接错误 (${res.status})，请检查后端服务日志`;
        }
        throw new Error(errorMessage);
      }
      
      const json = await res.json();
      if (json.success && json.data) {
        const { token, user } = json.data;
        authToken = token;
        localStorage.setItem("auth_token", token);
        
        const mappedUser: User = {
          id: String(user.id),
          name: user.username,
          email: user.email,
          role: user.isAdmin ? "ADMIN" : "USER",
          signature: user.signature
        };
        cachedUser = mappedUser;
        return mappedUser;
      }
      throw new Error(json.message || "登录失败");
    } catch (e: any) {
      console.error("Login error:", e);
      throw e;
    }
  },

  async register(username: string, email: string, password: string): Promise<boolean> {
    if (USE_MOCK_DATA) return true;
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      
      if (!res.ok) {
        let errorMessage = `请求失败: ${res.status}`;
        try {
            const errorJson = await res.json();
            errorMessage = errorJson.message || errorMessage;
        } catch {
            errorMessage = `服务器连接错误 (${res.status})，请检查后端服务日志`;
        }
        throw new Error(errorMessage);
      }
      
      const json = await res.json();
      if (json.success) {
        return true;
      }
      throw new Error(json.message || "注册失败");
    } catch (e: any) {
      console.error("Register error:", e);
      throw e;
    }
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
// --- src/api/api.ts 中的 userApi ---

export const userApi = {
    async updateProfile(name: string, signature: string): Promise<boolean> {
        try {
            if (!cachedUser) return false;
            
            // 后端接口要求 PUT /api/users/profile
            // 注意：根据文档，后端可能需要完整的 User 对象或者至少包含 ID
            const res = await fetch(`${API_BASE_URL}/users/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    id: Number(cachedUser.id), // 确保转换为数字
                    username: name,
                    email: cachedUser.email, // 补全必填信息，防止后端校验失败
                    signature: signature
                })
            });
            
            const json = await res.json();
            if (json.success) {
                // 更新本地缓存
                cachedUser.name = name;
                cachedUser.signature = signature;
                return true;
            }
            return false;
        } catch (e) {
            console.error("Update profile failed", e);
            return false;
        }
    },
    
    async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/users/password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    oldPassword,
                    newPassword,
                    confirmPassword: newPassword // 后端文档要求 confirmPassword 字段
                })
            });
            const json = await res.json();
            return !!json.success;
        } catch {
            return false;
        }
    }
};

// --- User Groups API ---
// --- src/api/api.ts 中的 groupApi ---

export const groupApi = {
    async getJoinedGroups(): Promise<Group[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/groups/joined?page=0&size=100`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return json.success && json.data ? json.data.content || [] : [];
        } catch { return []; }
    },
    
    async getManagedGroups(): Promise<Group[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/groups/created?page=0&size=100`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return json.success && json.data ? json.data.content || [] : [];
        } catch { return []; }
    },
    
    async searchGroups(query: string): Promise<Group[]> {
        try {
            // 如果 query 为空，则获取所有群组(或者不搜)
            const endpoint = query
                ? `/groups/search?query=${encodeURIComponent(query)}&page=0&size=20`
                : `/groups/all?page=0&size=20`;
            
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return json.data?.content || [];
        } catch { return []; }
    },
    
    async getGroupMembers(groupId: number): Promise<GroupMember[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            // 后端返回的 joinedAt 是时间戳或字符串，前端可以直接展示
            return json.data?.content || [];
        } catch { return []; }
    },
    
    async createGroup(name: string, description: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/groups`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({ name, description })
            });
            const json = await res.json();
            return !!json.success;
        } catch { return false; }
    },
    
    async updateGroup(groupId: number, name: string, description: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/groups`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                // 后端更新模型需要 ID
                body: JSON.stringify({ id: groupId, name, description })
            });
            const json = await res.json();
            return !!json.success;
        } catch { return false; }
    },
    
    async deleteGroup(id: number): Promise<void> {
        await fetch(`${API_BASE_URL}/groups/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    
    async joinGroup(groupId: number): Promise<boolean> {
        // 暂无直接加入接口，通常需要申请或被邀请
        console.warn("Join group API not implemented in backend");
        return false;
    },
    
    async leaveGroup(groupId: number): Promise<void> {
        if (!cachedUser) return;
        // 退出群组即移除自己
        await fetch(`${API_BASE_URL}/groups/${groupId}/members/${cachedUser.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    
    // 重点修改：处理添加成员逻辑
    async addGroupMember(groupId: number, emailOrId: string): Promise<boolean> {
        // 判断输入的是否包含 @ 符号，如果有则认为是邮箱
        const isEmail = emailOrId.includes('@');
        
        const payload: any = { groupId };
        
        if (isEmail) {
            payload.memberEmail = emailOrId;
        } else {
            // 尝试转数字，如果是纯数字 ID
            const id = Number(emailOrId);
            if (!isNaN(id)) {
                payload.accountId = id;
            } else {
                // 既不是邮箱也不是数字，可能是用户名？目前暂按邮箱处理或报错
                payload.memberEmail = emailOrId;
            }
        }
        
        try {
            const res = await fetch(`${API_BASE_URL}/groups/members`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!json.success) {
                alert(json.message || "添加失败");
            }
            return !!json.success;
        } catch { return false; }
    },
    
    async removeGroupMember(groupId: number, accountId: number): Promise<void> {
        await fetch(`${API_BASE_URL}/groups/${groupId}/members/${accountId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
};

// --- Admin API ---
// --- src/api/api.ts 中的 adminApi ---

export const adminApi = {
    // --- 用户管理 ---
    async getUsers(page = 0, size = 20): Promise<AdminUserSummary[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users?page=${page}&size=${size}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            const content = json?.data?.content ?? [];
            
            return content.map((a: any) => ({
                id: a.id,
                username: a.username,
                email: a.email,
                enabled: a.enabled !== false, // 如果后端没传 enabled 字段，默认视为 true
                lastLogin: a.lastLogin ? new Date(a.lastLogin).toISOString() : "从未登录"
            }));
        } catch { return []; }
    },
    
    async toggleUserStatus(id: number, enabled: boolean): Promise<void> {
        // 假设后端有类似接口，如果没有对应接口，此功能在前端会报错 404
        await fetch(`${API_BASE_URL}/admin/users/${id}/status?enabled=${enabled}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    
    async deleteUser(id: number): Promise<void> {
        await fetch(`${API_BASE_URL}/admin/users/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    
    // --- 黑名单管理 ---
    async getBlacklist(): Promise<BlacklistItem[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/blacklist`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return json.data || [];
        } catch { return []; }
    },
    
    async addToBlacklist(type: "IP" | "EMAIL", value: string): Promise<BlacklistItem> {
        const res = await fetch(`${API_BASE_URL}/admin/blacklist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({ type, value })
        });

        let json: any = null;
        try {
            json = await res.json();
        } catch {
            json = null;
        }

        if (!res.ok || !json?.success) {
            throw new Error(json?.message || `添加失败 (HTTP ${res.status})`);
        }

        return json.data;
    },
    
    async removeFromBlacklist(id: number): Promise<void> {
        await fetch(`${API_BASE_URL}/admin/blacklist/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    
    // --- 管理员群组操作 (复用 groupApi) ---
    async getGroups(): Promise<Group[]> { return groupApi.searchGroups(""); },
    async createGroup(name: string, description: string): Promise<boolean> { return groupApi.createGroup(name, description); },
    async deleteGroup(id: number): Promise<void> { return groupApi.deleteGroup(id); },
    async getGroupMembers(groupId: number): Promise<GroupMember[]> { return groupApi.getGroupMembers(groupId); },
    async addGroupMember(groupId: number, email: string): Promise<boolean> { return groupApi.addGroupMember(groupId, email); },
    async removeGroupMember(groupId: number, accountId: number): Promise<void> { return groupApi.removeGroupMember(groupId, accountId); },
    
    // --- 邮件队列 (如果后端没实现 HTTP 接口，这里只能留空) ---
    async getQueueStatus(): Promise<EmailQueueItem[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/queue/status`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            const items = json?.data ?? [];
            if (!Array.isArray(items)) return [];
            return items.map((a: any) => ({
                id: Number(a.id),
                emailId: Number(a.emailId),
                sender: a.sender ? String(a.sender) : "",
                recipients: Array.isArray(a.recipients)
                    ? a.recipients.map((r: any) => String(r))
                    : (a.recipients ? String(a.recipients).split(",").map(s => s.trim()).filter(Boolean) : []),
                subject: a.subject ? String(a.subject) : "",
                errorMessage: a.errorMessage ?? "",
                retryCount: Number(a.retryCount ?? 0),
                status: a.status,
                nextRetryTime: a.nextRetryTime ? String(a.nextRetryTime) : "",
                createdAt: a.createdAt ? String(a.createdAt) : "",
                updatedAt: a.updatedAt ? String(a.updatedAt) : ""
            }));
        } catch {
            return [];
        }
    },
    async processQueue(): Promise<void> {
        await fetch(`${API_BASE_URL}/queue/process`, {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    async resendQueueItem(queueId: number): Promise<void> {
        await fetch(`${API_BASE_URL}/queue/resend/${queueId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    async clearQueue(): Promise<void> {
        await fetch(`${API_BASE_URL}/queue/clear`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    },
    
    async getServerStatus(): Promise<string> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/server/status`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return json?.data ? String(json.data) : "";
        } catch {
            return "";
        }
    },
    
    async getServerStats(): Promise<string> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/server/stats`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return json?.data ? String(json.data) : "";
        } catch {
            return "";
        }
    },

    async startSmtpServer(): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/server/smtp/start`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return !!json?.success;
        } catch {
            return false;
        }
    },

    async stopSmtpServer(): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/server/smtp/stop`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return !!json?.success;
        } catch {
            return false;
        }
    },

    async startPop3Server(): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/server/pop3/start`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return !!json?.success;
        } catch {
            return false;
        }
    },

    async stopPop3Server(): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/server/pop3/stop`, {
                method: "POST",
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            return !!json?.success;
        } catch {
            return false;
        }
    },

    async getServerConfig(): Promise<ServerConfig> {
        const status = await this.getServerStatus();
        const smtpEnabled = status.includes("SMTP服务器运行中");
        const pop3Enabled = status.includes("POP3服务器运行中");
        return { smtpPort: 2525, pop3Port: 1100, domain: "localhost", smtpEnabled, pop3Enabled };
    },
    
    async updateServerConfig(config: ServerConfig): Promise<boolean> {
        const smtpOk = config.smtpEnabled ? await this.startSmtpServer() : await this.stopSmtpServer();
        const pop3Ok = config.pop3Enabled ? await this.startPop3Server() : await this.stopPop3Server();
        return smtpOk && pop3Ok;
    },
    
    async getLogs(): Promise<LogEntry[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/logs?limit=500`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            const items = json?.data ?? [];
            if (!json?.success || !Array.isArray(items)) return [];

            return items.map((a: any) => {
                const rawType = String(a.type ?? "SYSTEM").toUpperCase();
                const service: LogEntry["service"] = rawType === "SMTP" ? "SMTP" : rawType === "POP3" ? "POP3" : "SYSTEM";
                const status = String(a.status ?? "SUCCESS").toUpperCase();
                const level: LogEntry["level"] = status === "FAILURE" ? "ERROR" : "INFO";
                const action = a.action ? String(a.action) : "";
                const details = a.details ? String(a.details) : "";
                const operator = a.operator ? String(a.operator) : "";
                const message = [action, details].filter(Boolean).join(": ") || operator || "";
                return {
                    id: Number(a.id),
                    timestamp: a.createdAt ? String(a.createdAt) : new Date().toISOString(),
                    service,
                    level,
                    message
                };
            });
        } catch {
            return [];
        }
    },
    async clearLogs(): Promise<void> {
        await fetch(`${API_BASE_URL}/admin/logs`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    }
};

// --- Email Service ---
export interface IEmailService {
  getEmails(folder: Folder): Promise<Email[]>;
  getEmail(id: string): Promise<Email | undefined>;
  uploadAttachments(files: File[]): Promise<Attachment[]>;
  sendEmail(to: string[], subject: string, body: string, attachments?: Attachment[], isBroadcast?: boolean): Promise<boolean>;
  saveDraft(to: string[], subject: string, body: string): Promise<boolean>;
  markAsRead(id: string): Promise<void>;
  toggleStar(id: string, isStarred: boolean): Promise<void>;
  deleteEmail(id: string): Promise<void>;
}

// ... (保留之前的 import 和 api 定义)

class RealEmailService implements IEmailService {
    
    // 1. 获取邮件列表 (收件箱/发件箱/草稿箱等)
    async getEmails(folder: Folder): Promise<Email[]> {
        try {
            // 将前端 folder 类型转换为后端路径参数
            // 前端: 'inbox', 'sent', 'drafts', 'trash', 'starred'
            const res = await fetch(`${API_BASE_URL}/emails/${folder}?page=0&size=50`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            
            if (!json.success || !json.data) return [];
            
            const content = json.data.content || [];
            
            // 映射后端实体到前端 Email 接口
            return content.map((e: any) => ({
                id: String(e.id),
                folder: folder,
                from: {
                    name: e.sender ? e.sender.split('@')[0] : 'Unknown',
                    email: e.sender
                },
                to: Array.isArray(e.recipients) ? e.recipients : (e.recipients ? e.recipients.split(',') : []),
                subject: e.subject,
                body: e.body,
                snippet: e.body ? e.body.substring(0, 50) + '...' : "",
                date: e.receivedTime || e.createdAt || e.sentAt, // 优先使用 receivedTime
                isRead: e.isRead,
                isStarred: e.isStarred,
                attachments: e.attachments || [] // 映射附件
            }));
            
        } catch(e) {
            console.error("Get emails error:", e);
            return [];
        }
    }
    
    // 2. 获取邮件详情
    async getEmail(id: string): Promise<Email | undefined> {
        try {
            const res = await fetch(`${API_BASE_URL}/emails/detail/${id}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const json = await res.json();
            if (json.success && json.data) {
                const e = json.data;
                return {
                    id: String(e.id),
                    folder: 'inbox', // 这里的 folder 可能需要从后端获取，或者在列表页处理
                    from: { name: e.sender, email: e.sender },
                    to: Array.isArray(e.recipients) ? e.recipients : (e.recipients ? e.recipients.split(',') : []),
                    subject: e.subject,
                    body: e.body,
                    snippet: "",
                    date: e.receivedTime || e.createdAt,
                    isRead: e.isRead,
                    isStarred: e.isStarred,
                    attachments: e.attachments || []
                };
            }
        } catch {}
        return undefined;
    }
    
    // 3. 发送邮件
    async uploadAttachments(files: File[]): Promise<Attachment[]> {
        if (!files || files.length === 0) return [];
        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append("files", file);
            });

            const res = await fetch(`${API_BASE_URL}/attachments/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${authToken}`
                    // 不要设置 Content-Type，浏览器会自动设置为 multipart/form-data 并带上 boundary
                },
                body: formData
            });
            const json = await res.json();
            if (json.success && json.data) {
                return json.data;
            }
            return [];
        } catch (e) {
            console.error("Upload failed", e);
            return [];
        }
    }

    async sendEmail(to: string[], subject: string, body: string, attachments: Attachment[] = [], isBroadcast?: boolean): Promise<boolean> {
        try {
            if (isBroadcast) {
                const res = await fetch(`${API_BASE_URL}/admin/emails/broadcast`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ subject, content: body, attachments })
                });
                const json = await res.json();
                return !!json.success;
            }

            const res = await fetch(`${API_BASE_URL}/emails/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    to: to,
                    subject: subject,
                    body: body,
                    attachments: attachments,
                    cc: [],
                    bcc: []
                })
            });
            const json = await res.json();
            return !!json.success;
        } catch { return false; }
    }
    
    // 4. 保存草稿
    async saveDraft(to: string[], subject: string, body: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/emails/drafts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                },
                body: JSON.stringify({ to, subject, body })
            });
            const json = await res.json();
            return !!json.success;
        } catch { return false; }
    }
    
    // 5. 标记已读
    async markAsRead(id: string): Promise<void> {
        await fetch(`${API_BASE_URL}/emails/${id}/read`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`
            },
            body: "true" // 设置为已读
        });
    }
    
    // 6. 标记星标
    async toggleStar(id: string, isStarred: boolean): Promise<void> {
        await fetch(`${API_BASE_URL}/emails/${id}/star`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`
            },
            body: String(isStarred)
        });
    }
    
    // 7. 删除邮件
    async deleteEmail(id: string): Promise<void> {
        await fetch(`${API_BASE_URL}/emails/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authToken}` }
        });
    }
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

  async uploadAttachments(files: File[]): Promise<Attachment[]> {
      return files.map((f, i) => ({
          id: i,
          fileName: f.name,
          fileSize: f.size,
          contentType: f.type,
          filePath: "mock/path"
      }));
  }
  
  async sendEmail(to: string[], subject: string, body: string, attachments: Attachment[] = [], isBroadcast?: boolean): Promise<boolean> {
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
        isStarred: false,
        attachments: attachments
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
