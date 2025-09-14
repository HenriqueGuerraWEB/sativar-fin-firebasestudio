
"use client";

import React, { useState, useEffect } from 'react';
import { SativarLogo } from '../sativar-logo';
import { Progress } from '../ui/progress';

const loadingPhrases = [
    "Organizando suas finanças...",
    "Carregando seus clientes mais valiosos...",
    "Preparando insights para o seu negócio...",
    "Otimizando suas tarefas do dia...",
    "Construindo seus relatórios...",
    "A produtividade está a um passo de distância.",
    "Grandes negócios começam com grandes organizações.",
    "Quase pronto para impulsionar seu sucesso!"
];

export function LoadingPage() {
    const [progress, setProgress] = useState(10);
    const [phraseIndex, setPhraseIndex] = useState(0);

    useEffect(() => {
        const progressTimer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) {
                    clearInterval(progressTimer);
                    return 95;
                }
                return prev + 5;
            });
        }, 400);

        const phraseTimer = setInterval(() => {
            setPhraseIndex(prev => (prev + 1) % loadingPhrases.length);
        }, 2000);

        return () => {
            clearInterval(progressTimer);
            clearInterval(phraseTimer);
        };
    }, []);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                <div className="animate-pulse">
                    <SativarLogo className="h-16 w-16" />
                </div>
                <div className="w-48 text-center">
                     <p className="text-sm text-muted-foreground transition-opacity duration-500">
                        {loadingPhrases[phraseIndex]}
                    </p>
                </div>
                <Progress value={progress} className="h-2 w-48" />
            </div>
        </div>
    );
}
