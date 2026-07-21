'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Norm8SelectOption = {
  value: string;
  label: string;
};

type Norm8SelectProps = {
  options: Norm8SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  name?: string;
  ariaRequired?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorId?: string;
  className?: string;
  buttonClassName?: string;
  id?: string;
};

type DropdownPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
};

/**
 * Premium Norm8 dropdown used in place of native selects.
 * The menu is portalled to avoid clipping inside cards with overflow rules.
 */
export function Norm8Select({
  options,
  value,
  defaultValue = '',
  onValueChange,
  onBlur,
  placeholder = 'Selecionar...',
  name,
  ariaRequired,
  disabled,
  error,
  errorId,
  className,
  buttonClassName,
  id,
}: Norm8SelectProps) {
  const generatedId = React.useId();
  const listboxId = `${id ?? generatedId}-listbox`;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue);
  const [open, setOpen] = React.useState<boolean>(false);
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [dropdownPosition, setDropdownPosition] =
    React.useState<DropdownPosition | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const selectedValue = isControlled ? value : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);

  const updateDropdownPosition = React.useCallback((): void => {
    const trigger = rootRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const menuGap = 8;
    const preferredHeight = 288;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const opensUp = availableBelow < 180 && availableAbove > availableBelow;
    const availableSpace = opensUp ? availableAbove : availableBelow;
    const maxHeight = Math.max(
      160,
      Math.min(preferredHeight, availableSpace - menuGap),
    );

    const menuWidth = Math.min(
      window.innerWidth - viewportPadding * 2,
      Math.max(rect.width, 180),
    );

    setDropdownPosition({
      left: Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - viewportPadding - menuWidth,
      ),
      top: opensUp
        ? Math.max(viewportPadding, rect.top - maxHeight - menuGap)
        : rect.bottom + menuGap,
      width: menuWidth,
      maxHeight,
      placement: opensUp ? 'top' : 'bottom',
    });
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    updateDropdownPosition();

    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition]);

  const toggleOpen = (): void => {
    setOpen((currentOpen) => {
      const nextOpen = !currentOpen;

      if (nextOpen) {
        requestAnimationFrame(updateDropdownPosition);
      }

      return nextOpen;
    });
  };

  const commitValue = (nextValue: string): void => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
    setOpen(false);
  };

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleOpen();
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.preventDefault();

    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      (selectedIndex + direction + options.length) % options.length;
    const nextOption = options[nextIndex];

    if (nextOption) {
      commitValue(nextOption.value);
    }
  };

  const dropdown =
    mounted && dropdownPosition
      ? createPortal(
          <div
            ref={menuRef}
            className={cn(
              'fixed z-[9999] overflow-hidden rounded-xl border border-[#1F2B44] bg-[#091120]/95 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-150',
              open
                ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none scale-[0.98] opacity-0',
              dropdownPosition.placement === 'bottom'
                ? 'origin-top'
                : 'origin-bottom',
            )}
            style={{
              left: dropdownPosition.left,
              top: dropdownPosition.top,
              width: dropdownPosition.width,
            }}
          >
            <div
              className="overflow-y-auto p-1"
              id={listboxId}
              role="listbox"
              style={{ maxHeight: dropdownPosition.maxHeight }}
            >
              {options.map((option) => {
                const selected = option.value === selectedValue;

                return (
                  <button
                    aria-selected={selected}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#DDE6F6] outline-none transition-colors duration-150',
                      'hover:bg-[#13213A] focus-visible:bg-[#13213A]',
                      selected && 'bg-[#2563EB]/15 text-white',
                    )}
                    key={option.value}
                    onClick={() => commitValue(option.value)}
                    role="option"
                    type="button"
                  >
                    <span className="truncate">{option.label}</span>
                    {selected ? (
                      <Check
                        aria-hidden="true"
                        className="size-4 text-[#60A5FA]"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn('relative min-w-0 w-full', className)}>
      {name ? (
        <input
          name={name}
          type="hidden"
          value={selectedValue ?? ''}
        />
      ) : null}

      <button
        aria-controls={listboxId}
        aria-describedby={error ? errorId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={error || undefined}
        aria-required={ariaRequired}
        className={cn(
          'group flex min-h-11 min-w-0 w-full items-center justify-between rounded-xl border border-[#182034] bg-[#0D1526]/90 px-4 py-3 text-left text-sm text-[#E8EDF8] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] outline-none transition-all duration-200',
          'hover:border-[#2563EB]/60 hover:bg-[#101A2D]',
          'focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-[#F87171]/70 ring-2 ring-[#F87171]/15',
          open && !error && 'border-[#2563EB] bg-[#101A2D] ring-2 ring-[#2563EB]/25',
          buttonClassName,
        )}
        disabled={disabled}
        id={id}
        onClick={toggleOpen}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <span
          className={cn(
            'min-w-0 truncate',
            !selectedOption && 'text-[#8399B8]',
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'ml-3 size-4 shrink-0 text-[#8399B8] transition-transform duration-200 group-hover:text-[#E8EDF8]',
            open && 'rotate-180 text-[#E8EDF8]',
          )}
        />
      </button>
      {dropdown}
    </div>
  );
}

