import { Construction } from "lucide-react";

import { Card } from "@/components/ui/card";

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-base text-muted-foreground">{description}</p>
      </div>

      <Card className="flex min-h-[360px] items-center justify-center p-8 text-center shadow-sm">
        <div className="max-w-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
            <Construction className="size-6" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Disponible próximamente</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Estamos preparando esta sección para que puedas administrarla desde Flow.
          </p>
        </div>
      </Card>
    </main>
  );
}
