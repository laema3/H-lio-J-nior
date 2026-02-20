
export enum UserRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERADOR',
  ADVERTISER = 'ANUNCIANTE'
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

export interface Category {
  id: string;
  name: string;
}

export interface SiteConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroLabel: string;
  headerLogoUrl?: string;
  footerLogoUrl?: string;
  bannerFooterUrl?: string;
  pixKey?: string;
  pixName?: string;
  whatsapp?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  maintenanceMode?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  profession?: string;
  phone?: string;
  planId?: string;
  paymentStatus: PaymentStatus;
  expiresAt?: string; 
  createdAt: string;
  usedFreeTrial?: boolean;
  status?: 'ACTIVE' | 'BLOCKED';
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
  imageUrls?: string[]; 
  logoUrl?: string; 
  audioData?: string;
  createdAt: string;
  expiresAt?: string; 
}

export type ViewState = 'HOME' | 'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'ADMIN' | 'PAYMENT';
