export enum ViewState { 'HOME', 'LOGIN', 'REGISTER', 'DASHBOARD', 'ADMIN', 'RENEW' }

export enum UserRole { ADVERTISER = 'ADVERTISER', ADMIN = 'ADMIN' }

export enum PaymentStatus { PENDING = 'PENDING', CONFIRMED = 'CONFIRMED', CANCELLED = 'CANCELLED' }

export interface User {
    id: string;
    email: string;
    password?: string;
    name: string;
    phone: string;
    role: UserRole;
    paymentStatus: PaymentStatus;
    expiresAt?: string;
    status: 'ACTIVE' | 'BLOCKED';
}

export interface Post {
    id: string;
    title: string;
    content: string;
    category: string;
    logoUrl: string;
    authorId: string;
    authorName: string;
    whatsapp: string;
    phone: string;
    expiresAt: string;
    createdAt: string;
    approved: boolean;
}

export interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    durationDays: number;
}

export interface Category {
    id: string;
    name: string;
}

export interface SiteConfig {
    heroLabel: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImageUrl: string;
    bannerFooterUrl: string;
    whatsapp: string;
    phone: string;
    instagram: string;
    facebook: string;
    maintenanceMode: boolean;
    headerLogoUrl?: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    details: string;
    enabled: boolean;
    // PagSeguro specific fields
    pagseguroAppId?: string;
    pagseguroAppKey?: string;
    pagseguroEmail?: string;
    pagseguroToken?: string;
    pagseguroPublicKey?: string;
    pagseguroSandbox?: boolean;
    // Mercado Pago specific fields
    mercadopagoPublicKey?: string;
    mercadopagoAccessToken?: string;
    mercadopagoIntegratorId?: string;
    mercadopagoSandbox?: boolean;
}
