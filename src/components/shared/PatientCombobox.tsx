import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface PatientOption {
  id: string;
  full_name: string;
  default_session_value?: number | null;
  email?: string | null;
}

interface Props {
  patients: PatientOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** Render a value-side accessory (e.g. R$ session value). */
  renderTrailing?: (p: PatientOption) => React.ReactNode;
  /** Show "Todos" item with value "all" — useful for filters. */
  allowAll?: boolean;
  allLabel?: string;
}

/**
 * Searchable, keyboard-friendly patient selector.
 * Drop-in replacement for `<Select>` based patient dropdowns — handles long lists
 * without forcing the user to scroll.
 */
export function PatientCombobox({
  patients,
  value,
  onChange,
  placeholder = "Selecione o paciente",
  emptyText = "Nenhum paciente encontrado.",
  disabled,
  className,
  renderTrailing,
  allowAll,
  allLabel = "Todos os pacientes",
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => patients.find((p) => p.id === value),
    [patients, value]
  );

  const label = value === "all" && allowAll
    ? allLabel
    : selected?.full_name || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && value !== "all" && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate">{label}</span>
            {selected?.default_session_value ? (
              <span className="ml-1 shrink-0 text-xs text-muted-foreground">
                R$ {selected.default_session_value}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command
          filter={(value, search, keywords) => {
            const haystack = `${value} ${(keywords || []).join(" ")}`.toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar paciente..." icon={<Search className="h-4 w-4" />} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value="__all__"
                  keywords={[allLabel]}
                  onSelect={() => {
                    onChange("all");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === "all" ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              )}
              {patients.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  keywords={[p.full_name, p.email || ""]}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{p.full_name}</span>
                    {renderTrailing ? (
                      renderTrailing(p)
                    ) : p.default_session_value ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        R$ {p.default_session_value}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
