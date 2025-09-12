
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
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SignupPage() {
  const { user, signup, adminExists, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return; // Wait until auth state is determined
    
    if (user) {
      router.push("/dashboard");
    } else if (adminExists) {
      toast({
        title: "Acesso Negado",
        description: "Já existe um administrador para este sistema. Por favor, faça o login.",
      });
      router.push("/login");
    }
  }, [user, adminExists, authLoading, router, toast]);

  const handleSignup = async () => {
    if (adminExists) {
      toast({
        title: "Cadastro Bloqueado",
        description: "O registro de novas contas não é permitido.",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }
    if (!name) {
       toast({
        title: "Erro",
        description: "O campo nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await signup(email, password, name);
      toast({
        title: "Sucesso!",
        description: "Sua conta foi criada. Você será redirecionado.",
      });
      router.push("/dashboard");
    } catch (error: any) {
        let description = "Ocorreu um erro ao criar a conta.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Este e-mail já está em uso.";
        } else if (error.code === 'auth/weak-password') {
            description = "A senha deve ter pelo menos 6 caracteres.";
        }
      toast({
        title: "Erro de Cadastro",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
    if (authLoading || adminExists === null) {
      return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
            </div>
      )
    }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                 <SativarLogo />
            </div>
          <CardTitle className="text-2xl">Cadastro</CardTitle>
          <CardDescription>
            Crie sua conta para começar a gerenciar seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
             <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleSignup} disabled={isLoading} className="w-full">
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{" "}
            <Link href="/login" className="underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
