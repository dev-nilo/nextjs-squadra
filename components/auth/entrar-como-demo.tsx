"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { entrarComoDemo } from "@/app/actions/demo";
import { Button } from "@/components/ui/button";

/** One click into the shared demo account, for whoever just wants to look around. */
export function EntrarComoDemo() {
  const [entrando, setEntrando] = useState(false);

  const entrar = async () => {
    setEntrando(true);
    const resultado = await entrarComoDemo();
    if (!resultado.ok) {
      toast.error(resultado.message);
      setEntrando(false);
      return;
    }
    // A full load, so every part of the page starts from the new session.
    window.location.assign(resultado.caminho);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-default-500">
        <span className="h-px flex-1 bg-divider" />
        só quer dar uma olhada?
        <span className="h-px flex-1 bg-divider" />
      </div>
      <Button variant="flat" size="lg" radius="full" className="w-full" isLoading={entrando} startContent={<Eye size={18} />} onClick={entrar}>
        Entrar como demo
      </Button>
    </div>
  );
}
