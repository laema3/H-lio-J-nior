
export enum UserRole {
  ADMIN = 'ADMIN',
  ADVERTISER = 'ADVERTISER'
}

export enum PaymentStatus {
  CONFIRMED = 'PAGAMENTO CONFIRMADO',
  AWAITING = 'AGUARDANDO PAGAMENTO',
  NOT_APPLICABLE = 'N/A'
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  description: string;
}

export interface SiteConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroLabel: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profession?: string;
  phone?: string;
  planId?: string;
  paymentStatus: PaymentStatus;
  expiresAt?: string; 
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  category: string;
  title: string;
  content: string;
  whatsapp?: string;
  phone?: string;
  imageUrl?: string;
  createdAt: string;
}

export type ViewState = 'HOME' | 'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'ADMIN' | 'PAYMENT';
