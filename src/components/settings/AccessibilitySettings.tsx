import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accessibility } from "lucide-react";

type Size = "normal" | "large" | "xlarge";
const KEY = "psicoone.font-size";

export function AccessibilitySettings() {
  const [size, setSize] = useState<Size>("normal");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Size) || "normal";
    apply(saved);
    setSize(saved);
  }, []);

  const apply = (s: Size) => {
    const html = document.documentElement;
    if (s === "normal") html.removeAttribute("data-font-size");
    else html.setAttribute("data-font-size", s);
    localStorage.setItem(KEY, s);
  };

  const change = (s: Size) => { setSize(s); apply(s); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Accessibility className="h-4 w-4 text-primary" /> Acessibilidade
        </CardTitle>
        <CardDescription>Ajuste o tamanho da fonte do sistema</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {(["normal", "large", "xlarge"] as Size[]).map((s) => (
          <Button key={s} variant={size === s ? "default" : "outline"} size="sm" onClick={() => change(s)}>
            {s === "normal" ? "Normal" : s === "large" ? "Grande" : "Extra grande"}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
