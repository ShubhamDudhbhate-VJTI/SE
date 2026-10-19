import { tableRepository } from './repository';
import { AppError } from '../../middleware/error';
import { SocketEvents, type CreateTableInput, type UpdateTableInput, type TableStatus } from '@/contracts';
import type { Server } from 'socket.io';

export class TableService {
  async getAllTables() {
    return tableRepository.findAll();
  }

  async getTableById(id: string) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError('NOT_FOUND', 404, 'Table not found');
    return table;
  }

  async createTable(data: CreateTableInput, io?: Server) {
    const table = await tableRepository.create(data);
    io?.emit(SocketEvents.TABLE_UPDATED, { table });
    return table;
  }

  async updateTable(id: string, data: UpdateTableInput, io?: Server) {
    const table = await tableRepository.update(id, data);
    if (!table) throw new AppError('NOT_FOUND', 404, 'Table not found');
    io?.emit(SocketEvents.TABLE_UPDATED, { table });
    return table;
  }

  async updateTableStatus(id: string, status: TableStatus, io?: Server) {
    const table = await tableRepository.updateStatus(id, status);
    if (!table) throw new AppError('NOT_FOUND', 404, 'Table not found');
    io?.emit(SocketEvents.TABLE_UPDATED, { table });
    return table;
  }

  async deleteTable(id: string, io?: Server) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError('NOT_FOUND', 404, 'Table not found');

    await tableRepository.delete(id);
    io?.emit(SocketEvents.TABLE_UPDATED, { deletedId: id });
  }
}

export const tableService = new TableService();
