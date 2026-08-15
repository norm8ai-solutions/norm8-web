'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export type FinanceClientOption = {
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  id: string;
  label: string;
  searchValue: string;
};

type FinanceClientSelectProps = {
  clients: FinanceClientOption[];
  disabled?: boolean;
  error?: string;
  onChange: (client: FinanceClientOption | null) => void;
  placeholder?: string;
  value?: string | null;
};

type PopoverPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

const emptyClientValue = '__finance_no_client__';

export function FinanceClientSelect({
  clients,
  disabled,
  error,
  onChange,
  placeholder = 'Selecionar cliente',
  value,
}: FinanceClientSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [popoverPosition, setPopoverPosition] = React.useState<PopoverPosition | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const triggerId = React.useId();
  const listboxId = `${triggerId}-client-listbox`;

  const selectedClient = React.useMemo(
    () => clients.find((client) => client.id === value) ?? null,
    [clients, value],
  );
  const normalizedSearchTerm = normalizeSearch(searchTerm);

  const filteredClients = React.useMemo(() => {
    if (!normalizedSearchTerm) return clients;

    return clients.filter((client) => client.searchValue.includes(normalizedSearchTerm));
  }, [clients, normalizedSearchTerm]);

  const updatePopoverPosition = React.useCallback(() => {
    const trigger = rootRef.current;

    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 8;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const opensUp = availableBelow < 220 && availableAbove > availableBelow;
    const availableSpace = opensUp ? availableAbove : availableBelow;
    const maxHeight = Math.max(220, Math.min(360, availableSpace - gap));
    const width = Math.min(window.innerWidth - viewportPadding * 2, Math.max(rect.width, 320));

    setPopoverPosition({
      left: Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width),
      maxHeight,
      top: opensUp ? Math.max(viewportPadding, rect.top - maxHeight - gap) : rect.bottom + gap,
      width,
    });
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  function openMenu() {
    if (disabled) return;

    setOpen(true);
    requestAnimationFrame(updatePopoverPosition);
  }

  function selectClient(client: FinanceClientOption | null) {
    onChange(client);
    setSearchTerm('');
    setOpen(false);
  }

  const popover = mounted && open && popoverPosition
    ? createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] overflow-hidden rounded-xl border border-[#1F2B44] bg-[#091120]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          style={{
            left: popoverPosition.left,
            top: popoverPosition.top,
            width: popoverPosition.width,
          }}
        >
          <Command
            className="bg-transparent text-[#DDE6F6]"
            shouldFilter={false}
          >
            <CommandInput
              className="text-[#E8EDF8] placeholder:text-[#8399B8]"
              onValueChange={setSearchTerm}
              placeholder="Pesquisar por empresa, contacto ou email..."
              value={searchTerm}
            />
            <CommandList
              className="overflow-y-auto p-1"
              id={listboxId}
              style={{ maxHeight: popoverPosition.maxHeight }}
            >
              <CommandItem
                className="rounded-lg px-3 py-2.5 text-[#DDE6F6] data-[selected=true]:bg-[#13213A] data-[selected=true]:text-white"
                onSelect={() => selectClient(null)}
                value={emptyClientValue}
              >
                <span className="min-w-0 flex-1 truncate">Sem cliente associado</span>
                {!selectedClient ? <Check aria-hidden="true" className="size-4 text-[#60A5FA]" /> : null}
              </CommandItem>

              {filteredClients.length > 0 ? (
                filteredClients.map((client) => {
                  const selected = client.id === selectedClient?.id;
                  const meta = [client.contactName, client.email].filter(Boolean).join(' · ');

                  return (
                    <CommandItem
                      className="rounded-lg px-3 py-2.5 text-[#DDE6F6] data-[selected=true]:bg-[#13213A] data-[selected=true]:text-white"
                      key={client.id}
                      onSelect={() => selectClient(client)}
                      value={`${client.searchValue} ${client.id}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[#F8FAFC]">{client.companyName}</span>
                        {meta ? <span className="block truncate text-xs text-[#8EA4C8]">{meta}</span> : null}
                      </span>
                      {selected ? <Check aria-hidden="true" className="size-4 text-[#60A5FA]" /> : null}
                    </CommandItem>
                  );
                })
              ) : (
                <div className="py-6 text-center text-sm text-[#8EA4C8]">
                  Nenhum cliente encontrado.
                </div>
              )}
            </CommandList>
          </Command>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="finance-client-select relative min-w-0 w-full">
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={error ? true : undefined}
        className={cn(
          'group flex min-h-11 min-w-0 w-full items-center justify-between rounded-xl border border-[#182034] bg-[#0D1526]/90 px-4 py-3 text-left text-sm text-[#E8EDF8] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] outline-none transition-all duration-200',
          'hover:border-[#2563EB]/60 hover:bg-[#101A2D]',
          'focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-[#F87171]/70 ring-2 ring-[#F87171]/15',
          open && !error && 'border-[#2563EB] bg-[#101A2D] ring-2 ring-[#2563EB]/25',
        )}
        disabled={disabled}
        id={triggerId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        type="button"
      >
        <span className={cn('min-w-0 truncate', !selectedClient && 'text-[#8399B8]')}>
          {selectedClient?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'ml-3 size-4 shrink-0 text-[#8399B8] transition-transform duration-200 group-hover:text-[#E8EDF8]',
            open && 'rotate-180 text-[#E8EDF8]',
          )}
        />
      </button>

      {error ? <small className="admin-field-error">{error}</small> : null}
      {popover}
    </div>
  );
}

export function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}