import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useEffect } from 'react';
import { socket } from '../lib/socket';

export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    retry: false, // Don't retry if unauthenticated
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.user) {
      if (!socket.connected) {
        socket.connect();
      }
    } else if (!isLoading) {
      socket.disconnect();
    }
  }, [data?.user, isLoading]);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'active' });
      await queryClient.refetchQueries({ queryKey: ['me'], type: 'active' });
    },
  });

  const signupMutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'], refetchType: 'active' });
      await queryClient.refetchQueries({ queryKey: ['me'], type: 'active' });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      queryClient.clear(); // Clear all cache to prevent data leakage between sessions
      socket.disconnect();
    },
  });

  return {
    user: data?.user || null,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
};
