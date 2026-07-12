import React from "react";
import Link from "next/link";
import { Button } from "@nextui-org/react";

export default function HeroSection() {
  return (
    <section className="text-center py-12 sm:py-16 lg:py-20 px-4 bg-secondary/10 rounded-lg backdrop-blur-md border border-divider">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary mb-3 sm:mb-4">
        Bem‑vindo ao Squadra
      </h1>
      <p className="text-base sm:text-lg text-foreground/80 max-w-2xl mx-auto mb-6 sm:mb-8 font-medium">
        Crie times equilibrados de forma rápida e visualmente elegante. Explore as equipes geradas ou adicione seus próprios jogadores.
      </p>
      <Button
        as={Link}
        href="/teams"
        color="primary"
        size="lg"
        className="font-bold w-full sm:w-auto"
      >
        Ver Todas as Equipes
      </Button>
    </section>
  );
}
