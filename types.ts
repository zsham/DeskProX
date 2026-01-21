
export enum UserRole {
  ADMIN = 'ADMIN',
  PIC = 'PIC',
  CLIENT = 'CLIENT'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string; // Added for WhatsApp integration
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: string;
  isAI?: boolean;
  images?: string[];
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  creatorId: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  ticketId?: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
}

export interface AppState {
  currentUser: User;
  tickets: Ticket[];
  users: User[];
  comments: Comment[];
  notifications: Notification[];
}
