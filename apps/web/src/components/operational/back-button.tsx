import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BackButton({ onClick, label = "Volver" }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="ghost" className="w-fit" onClick={onClick}>
      <ArrowLeft /> {label}
    </Button>
  );
}
