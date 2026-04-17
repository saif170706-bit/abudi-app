'use client';

// This is a placeholder component.
// In the future, this could open a dialog to an AI-powered reciter discovery feature.

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AiReciterSelector({ onReciterSelect }: { onReciterSelect: (id: string) => void }) {
    const { toast } = useToast();

    const handleClick = () => {
        toast({
            title: "Feature Coming Soon",
            description: "AI-powered reciter selection will be available in a future update.",
        });
    }

    return (
        <Button variant="ghost" size="icon" onClick={handleClick}>
            <Sparkles />
        </Button>
    )
}
