export interface Category {
  id: string;
  userId?: string;
  name: string;
  color: string;
  threshold: number;
  isCustom: boolean;
  createdAt?: Date;
}

export interface FilteringRequirements {
  id: string;
  userId: string;
  name: string;
  description: string;
  categoryId: number;
  color: string;
  threshold: number;
  requirements: string[];
  createdAt: Date;
  matchThreshold: number;
  category: string;
}

export const getCategories = (customCategories: Category[]): Category[] => {
  return [
    {
      id: '0',
      userId: '0',
      name: 'All Classifications',
      color: '#6b7280',
      threshold: 0,
      isCustom: false,
      createdAt: new Date()
    },
    ...customCategories
  ];
};