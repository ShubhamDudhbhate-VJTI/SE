import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../api/client';
import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { useAuth } from './useAuth';
import {
  type Inventory,
  type CreateInventoryInput,
  type UpdateInventoryInput,
  type AdjustInventoryInput,
  SocketEvents
} from '@/contracts';

export function useInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.on(SocketEvents.INVENTORY_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    return () => {
      socket.off(SocketEvents.INVENTORY_UPDATED);
    };
  }, [queryClient, user]);

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['inventory'],
    queryKeyHashFn: () => 'inventory',
    queryFn: async () => {
      const res = await api.get<{ items: Inventory[] }>('/inventory');
      return res.data.items;
    }
  });

  const addItem = useMutation({
    mutationFn: async (data: CreateInventoryInput) => {
      const res = await api.post<{ item: Inventory }>('/inventory', data);
      return res.data.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: UpdateInventoryInput }) => {
      const res = await api.patch<{ item: Inventory }>(`/inventory/${id}`, data);
      return res.data.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const adjustStock = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: AdjustInventoryInput }) => {
      const res = await api.post<{ item: Inventory }>(`/inventory/${id}/adjust`, data);
      return res.data.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    adjustStock
  };
}
