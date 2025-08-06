
"use client";

import { SativarLogo } from "@/components/sativar-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 262" {...props}>
        <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.686H130.55v48.448h71.947c-1.45 12.04-9.283 30.175-26.686 30.175-16.149 0-29.656-13.319-29.656-29.656s13.507-29.656 29.656-29.656c8.326 0 13.786 3.592 16.609 6.279l21.05-21.05c-11.842-11.043-27.056-17.65-45.432-17.65-38.045 0-69.231 30.552-69.231 69.231s31.186 69.231 69.231 69.231c38.986 0 64.922-27.116 64.922-67.346 0-4.42-.39-8.58-.952-12.445z"/>
        <path fill="#34A853" d="M130.55 261.1c33.748 0 62.182-11.043 82.894-30.175L192.345 201c-11.842 7.675-26.548 12.445-42.303 12.445-33.022 0-61.186-22.38-71.282-52.28H28.705v31.09C48.91 229.092 86.61 261.1 130.55 261.1z"/>
        <path fill="#FBBC05" d="M59.268 158.724c-3.182-9.283-3.182-19.27-3.182-29.656s0-20.373 3.182-29.656V68.314H28.705c-9.283 18.567-14.656 39.405-14.656 60.754s5.373 42.187 14.656 60.754l30.563-31.09z"/>
        <path fill="#EB4335" d="M130.55 50.479c14.904 0 28.598 5.122 39.383 15.397l21.05-21.05C173.078 25.122 153.454 12 130.55 12c-43.945 0-81.645 32.008-101.84 78.432l30.563 31.09c10.096-29.9 38.26-52.28 71.282-52.28z"/>
    </svg>
);


export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro de Login",
        description:
          error.code === "auth/invalid-credential"
            ? "Credenciais inválidas. Verifique seu e-mail e senha."
            : "Ocorreu um erro ao tentar fazer login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setIsLoading(true);
      try {
          await loginWithGoogle();
          router.push('/dashboard');
      } catch (error) {
          toast({
              title: 'Erro de Login com Google',
              description: 'Não foi possível fazer login com o Google.',
              variant: 'destructive',
          });
          setIsLoading(false);
      }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <SativarLogo />
            </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Entre na sua conta para acessar o dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Login com Google
            </Button>
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        Ou continue com
                    </span>
                </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleLogin} disabled={isLoading} className="w-full">
              {isLoading ? "Entrando..." : "Login"}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{" "}
            <Link href="/signup" className="underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
