'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Norm8PhoneCountry = {
  iso2: string;
  dialCode: string;
  name: string;
  nationalDigits: number;
  groups: number[];
};

export type Norm8PhoneInputChange = {
  country: Norm8PhoneCountry;
  displayValue: string;
  isValid: boolean;
  normalizedValue: string;
};

type Norm8PhoneInputProps = {
  buttonClassName?: string;
  className?: string;
  defaultValue?: string | null;
  disabled?: boolean;
  error?: boolean;
  errorId?: string;
  inputClassName?: string;
  name: string;
  onBlur?: () => void;
  onValueChange?: (value: Norm8PhoneInputChange) => void;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
};

export const PHONE_COUNTRIES: Norm8PhoneCountry[] = [
  { iso2: 'PT', dialCode: '351', name: 'Portugal', nationalDigits: 9, groups: [3, 3, 3] },
  { iso2: 'ES', dialCode: '34', name: 'Espanha', nationalDigits: 9, groups: [3, 3, 3] },
  { iso2: 'FR', dialCode: '33', name: 'França', nationalDigits: 9, groups: [1, 2, 2, 2, 2] },
  { iso2: 'UK', dialCode: '44', name: 'Reino Unido', nationalDigits: 10, groups: [4, 3, 3] },
  { iso2: 'BR', dialCode: '55', name: 'Brasil', nationalDigits: 11, groups: [2, 5, 4] },
  { iso2: 'US', dialCode: '1', name: 'Estados Unidos', nationalDigits: 10, groups: [3, 3, 4] },
  { iso2: 'AO', dialCode: '244', name: 'Angola', nationalDigits: 9, groups: [3, 3, 3] },
  { iso2: 'MZ', dialCode: '258', name: 'Moçambique', nationalDigits: 9, groups: [3, 3, 3] },
  { iso2: 'CV', dialCode: '238', name: 'Cabo Verde', nationalDigits: 7, groups: [3, 2, 2] },
  { iso2: 'GW', dialCode: '245', name: 'Guiné-Bissau', nationalDigits: 7, groups: [3, 2, 2] },
  { iso2: 'ST', dialCode: '239', name: 'São Tomé e Príncipe', nationalDigits: 7, groups: [3, 2, 2] },
];

const defaultCountry = PHONE_COUNTRIES[0];

export function Norm8PhoneInput({
  buttonClassName,
  className,
  defaultValue,
  disabled,
  error,
  errorId,
  inputClassName,
  name,
  onBlur,
  onValueChange,
}: Norm8PhoneInputProps) {
  const initial = React.useMemo(() => parseInitialPhone(defaultValue), [defaultValue]);
  const [country, setCountry] = React.useState<Norm8PhoneCountry>(initial.country);
  const [displayValue, setDisplayValue] = React.useState(initial.displayValue);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState<MenuPosition | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerLabel = `${country.iso2} +${country.dialCode}`;
  const normalizedValue = normalizePhoneValue(country, displayValue);
  const isValid = isPhoneValueValid(country, normalizedValue);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    onValueChange?.({ country, displayValue, isValid, normalizedValue });
  }, [country, displayValue, isValid, normalizedValue, onValueChange]);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const updateMenuPosition = React.useCallback((): void => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const viewportPadding = 10;
    const width = Math.min(Math.max(rect.width, 280), window.innerWidth - viewportPadding * 2);

    setMenuPosition({
      left: Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width),
      top: rect.bottom + 8,
      width,
    });
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const handleCountryChange = (nextCountry: Norm8PhoneCountry): void => {
    const nationalDigits = getNationalDigits(displayValue).slice(0, nextCountry.nationalDigits);
    setCountry(nextCountry);
    setDisplayValue(formatNationalNumber(nationalDigits, nextCountry));
    setOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const parsed = parsePhoneInput(event.target.value, country);
    const limitedDigits = parsed.nationalDigits.slice(0, parsed.country.nationalDigits);

    if (parsed.country.iso2 !== country.iso2) {
      setCountry(parsed.country);
    }

    setDisplayValue(formatNationalNumber(limitedDigits, parsed.country));
  };

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }

    setOpen((currentOpen) => {
      const nextOpen = !currentOpen;

      if (nextOpen) {
        requestAnimationFrame(updateMenuPosition);
      }

      return nextOpen;
    });
  };

  const menu = mounted && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          className={cn('manual-phone-country-menu', open ? 'manual-phone-country-menu-open' : 'manual-phone-country-menu-closed')}
          role="listbox"
          style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
        >
          {PHONE_COUNTRIES.map((option) => {
            const selected = option.iso2 === country.iso2;

            return (
              <button
                aria-selected={selected}
                className={cn('manual-phone-country-option', selected && 'manual-phone-country-option-selected')}
                key={option.iso2}
                onClick={() => handleCountryChange(option)}
                role="option"
                type="button"
              >
                <span>{option.iso2} +{option.dialCode}</span>
                <strong>{option.name}</strong>
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className={cn('manual-phone-input', error && 'manual-phone-input-error', className)}>
      <input name={name} type="hidden" value={normalizedValue} />
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn('manual-phone-country-trigger', buttonClassName)}
        disabled={disabled}
        onClick={toggleOpen}
        type="button"
      >
        <span>{triggerLabel}</span>
        <ChevronDown aria-hidden="true" className={cn('manual-phone-country-icon', open && 'manual-phone-country-icon-open')} />
      </button>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error || undefined}
        autoComplete="tel"
        className={cn('manual-phone-number-input', inputClassName)}
        disabled={disabled}
        inputMode="tel"
        maxLength={getFormattedMaxLength(country)}
        onBlur={onBlur}
        onChange={handleInputChange}
        placeholder={getPhonePlaceholder(country)}
        type="tel"
        value={displayValue}
      />
      {menu}
    </div>
  );
}

export function isNormalizedPhoneValid(value: string): boolean {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  const country = getCountryFromNormalizedPhone(trimmedValue);

  if (!country) {
    return false;
  }

  const nationalDigits = trimmedValue.slice(country.dialCode.length + 1).replace(/\D/g, '');
  return nationalDigits.length === country.nationalDigits;
}

function parseInitialPhone(value?: string | null): { country: Norm8PhoneCountry; displayValue: string } {
  if (!value) {
    return { country: defaultCountry, displayValue: '' };
  }

  const parsed = parsePhoneInput(value, defaultCountry);
  return {
    country: parsed.country,
    displayValue: formatNationalNumber(parsed.nationalDigits.slice(0, parsed.country.nationalDigits), parsed.country),
  };
}

function parsePhoneInput(value: string, fallbackCountry: Norm8PhoneCountry): { country: Norm8PhoneCountry; nationalDigits: string } {
  const trimmedValue = value.trim();
  const allDigits = getNationalDigits(trimmedValue);

  if (!trimmedValue.startsWith('+')) {
    return { country: fallbackCountry, nationalDigits: allDigits };
  }

  const matchedCountry = getCountryFromDigits(allDigits);

  if (!matchedCountry) {
    return { country: fallbackCountry, nationalDigits: allDigits.slice(0, fallbackCountry.nationalDigits) };
  }

  return {
    country: matchedCountry,
    nationalDigits: allDigits.slice(matchedCountry.dialCode.length),
  };
}

function normalizePhoneValue(country: Norm8PhoneCountry, displayValue: string): string {
  const nationalDigits = getNationalDigits(displayValue).slice(0, country.nationalDigits);
  return nationalDigits ? `+${country.dialCode}${nationalDigits}` : '';
}

function getCountryFromNormalizedPhone(value: string): Norm8PhoneCountry | undefined {
  return getCountryFromDigits(getNationalDigits(value));
}

function getCountryFromDigits(digits: string): Norm8PhoneCountry | undefined {
  return [...PHONE_COUNTRIES]
    .sort((first, second) => second.dialCode.length - first.dialCode.length)
    .find((item) => digits.startsWith(item.dialCode));
}

function isPhoneValueValid(country: Norm8PhoneCountry, normalizedValue: string): boolean {
  if (!normalizedValue) {
    return true;
  }

  const nationalDigits = normalizedValue.slice(country.dialCode.length + 1).replace(/\D/g, '');
  return nationalDigits.length === country.nationalDigits;
}

function formatNationalNumber(nationalDigits: string, country: Norm8PhoneCountry): string {
  return groupDigits(getNationalDigits(nationalDigits).slice(0, country.nationalDigits), country.groups);
}

function groupDigits(value: string, groups: number[]): string {
  const parts: string[] = [];
  let cursor = 0;

  for (const size of groups) {
    const part = value.slice(cursor, cursor + size);

    if (!part) {
      break;
    }

    parts.push(part);
    cursor += size;
  }

  const remaining = value.slice(cursor);
  if (remaining) {
    parts.push(remaining);
  }

  return parts.join(' ');
}

function getNationalDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function getFormattedMaxLength(country: Norm8PhoneCountry): number {
  const separators = Math.max(0, country.groups.filter(Boolean).length - 1);
  return country.nationalDigits + separators;
}

function getPhonePlaceholder(country: Norm8PhoneCountry): string {
  if (country.iso2 === 'PT') {
    return '912 345 678';
  }

  return 'Número local';
}