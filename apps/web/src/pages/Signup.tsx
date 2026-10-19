import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignupSchema, SignupInput } from '@/contracts';
import { useAuth } from '../hooks/useAuth';
import { Link, Navigate } from 'react-router-dom';
import { getDefaultRedirectPath } from '../utils/authRedirect';

export default function Signup() {
  const { signup, user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema)
  });

  if (user) {
    return <Navigate to={getDefaultRedirectPath(user.role)} replace />;
  }

  const onSubmit = async (data: SignupInput) => {
    try {
      setError(null);
      await signup(data);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f3eadf] flex items-center justify-center p-4 font-sans text-[#28231f]">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-[-10%] top-[10%] h-[50%] w-[50%] rounded-full bg-[#ead7c8]/40 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[10%] h-[50%] w-[50%] rounded-full bg-[#dce5d7]/60 blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md border border-[#d9cbbd] bg-[#fffaf3] p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_rgba(88,62,42,0.08)] text-center">
          
          <h1 className="text-4xl font-normal tracking-tight text-[#28231f] mb-3">
            Join the Room
          </h1>
          <p className="text-[#756b63] text-sm mb-10">
            Create an account to start your dining experience
          </p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
            {error && (
              <div className="p-4 text-xs font-semibold uppercase tracking-widest text-[#a3543e] bg-[#f8e7e2] border border-[#d9a79b] rounded-xl">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#756b63] ml-1">Full Name</label>
              <input
                id="name"
                placeholder="John Doe"
                {...register('name')}
                className="w-full bg-[#f3eadf]/30 border border-[#d9cbbd] rounded-xl px-4 py-3.5 text-[#28231f] placeholder:text-[#9b8e83] focus:outline-none focus:ring-2 focus:ring-[#356b4f] transition-all"
              />
              {errors.name && <p className="text-xs text-[#a3543e] mt-1 ml-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#756b63] ml-1">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className="w-full bg-[#f3eadf]/30 border border-[#d9cbbd] rounded-xl px-4 py-3.5 text-[#28231f] placeholder:text-[#9b8e83] focus:outline-none focus:ring-2 focus:ring-[#356b4f] transition-all"
              />
              {errors.email && <p className="text-xs text-[#a3543e] mt-1 ml-1">{errors.email.message}</p>}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#756b63] ml-1">Password</label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full bg-[#f3eadf]/30 border border-[#d9cbbd] rounded-xl px-4 py-3.5 text-[#28231f] placeholder:text-[#9b8e83] focus:outline-none focus:ring-2 focus:ring-[#356b4f] transition-all"
              />
              {errors.password && <p className="text-xs text-[#a3543e] mt-1 ml-1">{errors.password.message}</p>}
            </div>
            
            <button 
              type="submit" 
              className="w-full mt-8 bg-[#356b4f] text-white py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#28573f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-[#d9cbbd] text-sm text-[#756b63]">
            Already have an account? 
            <Link to="/login" className="ml-2 text-[#356b4f] hover:underline font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </div>
  );
}
