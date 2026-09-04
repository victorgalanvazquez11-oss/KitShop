'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shirt, Loader2, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup';

export default function AdminLoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/admin/dashboard');
      else setChecking(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          toast.error('La contraseña debe tener al menos 6 caracteres.');
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Las contraseñas no coinciden.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
              `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          const message = error.message.toLowerCase();
          if (message.includes('password')) {
            throw new Error('La contraseña no cumple los requisitos mínimos.');
          }
          throw new Error('No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.');
        }

        if (data.session) {
          toast.success('Cuenta creada correctamente.');
          router.push('/admin/dashboard');
        } else {
          toast.success('Cuenta creada. Revisa tu correo para confirmar la cuenta.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;
      router.push('/admin/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-900"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  const isSignup = mode === 'signup';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <Card className="w-full max-w-md animate-scale-in border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
            <Shirt className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Panel de administración</CardTitle>
          <CardDescription className="text-slate-400">
            {isSignup ? 'Crea una cuenta para acceder al panel.' : 'Acceso restringido. Solo administradores.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@kitshop.com" required className="mt-1.5 border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500" />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="mt-1.5 border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500" />
            </div>
            {isSignup && (
              <div>
                <Label htmlFor="confirm-password" className="text-slate-300">Confirmar contraseña</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="mt-1.5 border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500" />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{isSignup ? 'Creando cuenta...' : 'Iniciando sesión...'}</> : <>{isSignup ? <UserPlus className="mr-2 h-5 w-5" /> : <Lock className="mr-2 h-5 w-5" />}{isSignup ? 'Crear cuenta' : 'Iniciar sesión'}</>}
            </Button>
          </form>
          <button type="button" onClick={() => setMode(isSignup ? 'login' : 'signup')} className="mt-4 w-full text-sm text-blue-400 hover:text-blue-300">
            {isSignup ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
