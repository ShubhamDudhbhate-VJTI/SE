import { menuRepository } from './repository';
import { SocketEvents, type CategoryWithItems, type CreateCategoryInput, type UpdateCategoryInput, type CreateMenuItemInput, type UpdateMenuItemInput } from '@/contracts';
import { AppError } from '../../middleware/error';
import type { Server } from 'socket.io';

export class MenuService {
  async getMenu(): Promise<CategoryWithItems[]> {
    const allCategories = await menuRepository.getAllCategories();
    const allItems = await menuRepository.getAllMenuItems();

    return allCategories.map(cat => ({
      ...cat,
      items: allItems.filter(item => item.categoryId === cat.id)
    }));
  }

  async createCategory(data: CreateCategoryInput, io?: Server) {
    const category = await menuRepository.createCategory(data);
    io?.emit(SocketEvents.MENU_UPDATED);
    return category;
  }

  async updateCategory(id: string, data: UpdateCategoryInput, io?: Server) {
    const category = await menuRepository.updateCategory(id, data);
    if (!category) throw new AppError('NOT_FOUND', 404, 'Category not found');
    io?.emit(SocketEvents.MENU_UPDATED);
    return category;
  }

  async deleteCategory(id: string, io?: Server) {
    await menuRepository.deleteCategory(id);
    io?.emit(SocketEvents.MENU_UPDATED);
  }

  async createMenuItem(data: CreateMenuItemInput, io?: Server) {
    const item = await menuRepository.createMenuItem(data);
    io?.emit(SocketEvents.MENU_UPDATED);
    return item;
  }

  async updateMenuItem(id: string, data: UpdateMenuItemInput, io?: Server) {
    const item = await menuRepository.updateMenuItem(id, data);
    if (!item) throw new AppError('NOT_FOUND', 404, 'Menu item not found');
    io?.emit(SocketEvents.MENU_UPDATED);
    return item;
  }

  async deleteMenuItem(id: string, io?: Server) {
    await menuRepository.deleteMenuItem(id);
    io?.emit(SocketEvents.MENU_UPDATED);
  }
}

export const menuService = new MenuService();
