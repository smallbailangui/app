
export type Folder = "inbox" | "sent" | "drafts" | "junk" | "trash" | "starred";
export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  signature?: string;
}

export interface Email {
  id: string;
  folder: Folder;
  from: { name: string; email: string };
  to: string[];
  subject: string;
  body: string;
  snippet: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
}

export interface AdminUserSummary {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  lastLogin: string;
  quotaLimit: number;
  usedSpace: number;
}

export interface BlacklistItem {
  id: number;
  type: "IP" | "EMAIL";
  value: string;
  createdAt: string;
}

export interface Group {
  id: number;
  ownerId: string; // Add ownerId to track who created the group
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
}

export interface GroupMember {
  id: number;
  accountId: number;
  username: string;
  email: string;
  joinedAt: string;
}

export interface EmailQueueItem {
  id: number;
  emailId: number;
  errorMessage: string;
  retryCount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  nextRetryTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerConfig {
  smtpPort: number;
  pop3Port: number;
  domain: string;
  smtpEnabled: boolean;
  pop3Enabled: boolean;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  service: "SMTP" | "POP3" | "SYSTEM";
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

export const CURRENT_USER: User = {
  id: "0",
  name: "Alex Dev",
  email: "alex@example.com",
  role: "USER"
};
