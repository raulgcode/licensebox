// Example shared types
// Add your shared TypeScript types here

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface License {
  id: string;
  key: string;
  userId: string;
  productId: string;
  status: 'active' | 'expired' | 'revoked';
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Export auth types
export * from './auth.types';
