
export enum UserRole {
  ADMIN = 'ADMIN',
  ADVERTISER = 'ADVERTISER',
  VISITOR = 'VISITOR'
}

export enum ProfessionCategory {
  RADIO = 'Radialista/Mídia',
  HEALTH = 'Saúde e Bem-estar',
  LEGAL = 'Jurídico',
  CONSTRUCTION = 'Construção e Reformas',
  TECH = 'Tecnologia e Design',
  EDUCATION = 'Educação',
  EVENTS = 'Festas e Eventos',
  OTHER = 'Outros'
}

export enum PaymentStatus {
  CONFIRMED = 'PAGAMENTO CONFIRMADO',
  AWAITING = 'AGUARDANDO PAGAMENTO',
  BLOCKED = 'BLOQUEADO',
  NOT_APPLICABLE = 'N/A'
}

export enum PaymentMethodType {
  PIX = 'PIX',
  CREDIT_CARD = 'Cartão de Crédito',
  DEBIT_CARD = 'Cartão de Débito'
}

export interface Plan {
  id: string;
  name: string;
  price: number;
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
  profession?: ProfessionCategory;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  planId?: string; // ID do plano selecionado
  paymentStatus: PaymentStatus;
  paymentConfirmedAt?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  category: ProfessionCategory;
  title: string;
  content: string;
  whatsapp?: string;
  phone?: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
}

export type ViewState = 'HOME' | 'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'ADMIN' | 'PAYMENT';
