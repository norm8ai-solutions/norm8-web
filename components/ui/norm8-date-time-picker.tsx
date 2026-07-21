'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CalendarIcon, ChevronDown, Clock, LoaderCircle, X } from 'lucide-react';
import { pt } from 'react-day-picker/locale';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type Norm8TimeOption = { time: string; disabled?: boolean; label?: string };

type Norm8DateTimePickerProps = {
  value?: Date | string | null;
  defaultValue?: Date | string | null;
  onValueChange?: (value: Date | null) => void;
  onDayChange?: (value: Date) => void;
  name?: string;
  placeholder?: string;
  ariaRequired?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorId?: string;
  className?: string;
  buttonClassName?: string;
  id?: string;
  clearable?: boolean;
  density?: 'default' | 'compact';
  timeOptions?: Norm8TimeOption[];
  timeOptionsLoading?: boolean;
  emptyTimeMessage?: string;
  mode?: 'date' | 'datetime';
};

type PopoverPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b'];

const TIME_OPTIONS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
];

/**
 * Norm8 branded date/time picker for admin forms.
 * The popover is portalled so it is not clipped by dashboard cards.
 */
export function Norm8DateTimePicker({
  value,
  defaultValue,
  onValueChange,
  onDayChange,
  name,
  placeholder = 'Selecionar data e hora...',
  ariaRequired,
  disabled,
  error,
  errorId,
  className,
  buttonClassName,
  id,
  clearable = true,
  density = 'default',
  timeOptions,
  timeOptionsLoading = false,
  emptyTimeMessage = 'Sem horários disponíveis para este dia.',
  mode = 'datetime',
}: Norm8DateTimePickerProps) {
  const generatedId = React.useId();
  const triggerId = id ?? generatedId;
  const popoverId = `${triggerId}-popover`;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<Date | null>(
    parseDateValue(defaultValue),
  );
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<'date' | 'time'>('date');
  const [pendingDay, setPendingDay] = React.useState<Date | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [popoverPosition, setPopoverPosition] =
    React.useState<PopoverPosition | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const selectedDate = isControlled ? parseDateValue(value) : internalValue;
  const normalizedTimeOptions = React.useMemo<Norm8TimeOption[]>(
    () => timeOptions ?? TIME_OPTIONS.map((time) => ({ time })),
    [timeOptions],
  );
  const selectedTime = selectedDate ? formatTimeValue(selectedDate) : '10:00';
  const availableTimeOptions = normalizedTimeOptions.filter((option) => !option.disabled);

  const commitValue = React.useCallback(
    (nextValue: Date | null): void => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  const updatePopoverPosition = React.useCallback((): void => {
    const trigger = rootRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportPadding = 16;
    const popoverGap = 8;
    const preferredHeight = step === 'date' ? (density === 'compact' ? 350 : 390) : 360;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const availableBelow = viewportBottom - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportTop - viewportPadding;
    const opensUp = availableBelow < 340 && availableAbove > availableBelow;
    const maxHeight = Math.max(
      120,
      Math.min(preferredHeight, viewportHeight - viewportPadding * 2),
    );
    const desiredTop = opensUp
      ? rect.top - maxHeight - popoverGap
      : rect.bottom + popoverGap;

    const popoverWidth = Math.min(
      viewportWidth - viewportPadding * 2,
      Math.max(rect.width, 360),
    );

    setPopoverPosition({
      left: Math.min(
        Math.max(viewportLeft + viewportPadding, rect.right - popoverWidth),
        viewportRight - viewportPadding - popoverWidth,
      ),
      top: Math.min(
        Math.max(viewportTop + viewportPadding, desiredTop),
        viewportBottom - viewportPadding - maxHeight,
      ),
      width: popoverWidth,
      maxHeight,
      placement: opensUp ? 'top' : 'bottom',
    });
  }, [density, step]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
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

    updatePopoverPosition();

    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  const toggleOpen = (): void => {
    if (disabled) {
      return;
    }

    setOpen((currentOpen) => {
      const nextOpen = !currentOpen;

      if (nextOpen) {
        setStep('date');
        setPendingDay(null);
        requestAnimationFrame(updatePopoverPosition);
      }

      return nextOpen;
    });
  };

  const handleDaySelect = (day?: Date): void => {
    if (!day) {
      return;
    }

    onDayChange?.(day);

    if (mode === 'date') {
      const selectedDay = new Date(day);
      selectedDay.setHours(12, 0, 0, 0);
      commitValue(selectedDay);
      setOpen(false);
      setStep('date');
      setPendingDay(null);
      return;
    }

    setPendingDay(day);
    setStep('time');
  };

  const handleTimeSelect = (time: string): void => {
    const option = normalizedTimeOptions.find((timeOption) => timeOption.time === time);

    if (option?.disabled) {
      return;
    }

    const baseDate = pendingDay ?? selectedDate ?? new Date();
    commitValue(mergeDateAndTime(baseDate, time));
    setOpen(false);
    setStep('date');
    setPendingDay(null);
  };

  const clearValue = (event: React.MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
    commitValue(null);
  };

  const displayValue = selectedDate
    ? mode === 'date'
      ? formatDatePt(selectedDate)
      : formatDateTimePt(selectedDate)
    : placeholder;

  const popover =
    mounted && popoverPosition
      ? createPortal(
          <div
            ref={popoverRef}
            className={cn(
              'fixed z-[9999] overflow-x-hidden overflow-y-auto rounded-xl border border-[#1F2B44] bg-[#091120]/95 shadow-2xl shadow-black/45 backdrop-blur-xl transition-all duration-150',
              open
                ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none scale-[0.98] opacity-0',
              popoverPosition.placement === 'bottom'
                ? 'origin-top'
                : 'origin-bottom',
            )}
            id={popoverId}
            role="dialog"
            style={{
              left: popoverPosition.left,
              top: popoverPosition.top,
              width: popoverPosition.width,
              maxHeight: popoverPosition.maxHeight,
            }}
          >
            <div className={cn('min-w-0 overflow-hidden', density === 'compact' ? 'p-2' : 'p-3')}>
              {step === 'date' ? (
              <Calendar
                className={cn('w-full min-w-0 rounded-lg border border-[#182034] bg-[#0D1526]/80 text-[#E8EDF8]', density === 'compact' && 'text-sm')}
                classNames={{
                  caption_label: 'text-sm font-semibold text-[#E8EDF8]',
                  month_grid: 'w-full table-fixed border-separate border-spacing-y-1',
                  weekdays: '',
                  weekday: cn(
                    'rounded-md text-center align-middle text-[0.75rem] font-semibold text-[#8399B8]',
                    density === 'compact' ? 'h-8 w-8' : 'h-9 w-9',
                  ),
                  week: '',
                  cell: cn('p-0 text-center align-middle', density === 'compact' ? 'h-8 w-8' : 'h-9 w-9'),
                  day: cn('p-0 text-center align-middle text-sm font-medium text-[#DDE6F6]', density === 'compact' ? 'h-8 w-8' : 'h-9 w-9'),
                  day_button: cn(
                    'relative inline-flex items-center justify-center rounded-lg border border-transparent p-0 text-center text-sm font-medium text-[#DDE6F6] outline-none transition-colors hover:bg-[#13213A] focus-visible:bg-[#13213A] focus-visible:ring-2 focus-visible:ring-[#60A5FA]/45',
                    density === 'compact' ? 'h-8 w-8' : 'h-9 w-9',
                  ),
                  selected:
                    '[&>button]:border-[#2563EB] [&>button]:bg-[#2563EB] [&>button]:text-white [&>button]:hover:bg-[#2563EB] [&>button]:focus-visible:bg-[#2563EB]',
                  today:
                    '[&>button]:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.55)]',
                  outside: '[&>button]:text-[#536682] [&>button]:opacity-50',
                  disabled: '[&>button]:text-[#536682] [&>button]:opacity-40',
                  head_cell: cn(
                    'rounded-md text-center align-middle text-[0.75rem] font-semibold text-[#8399B8]',
                    density === 'compact' ? 'h-8 w-8' : 'h-9 w-9',
                  ),
                  row: '',
                  day_selected:
                    'bg-transparent text-white [&>button]:bg-[#2563EB] [&>button]:text-white [&>button]:hover:bg-[#2563EB]',
                  day_today:
                    'bg-transparent [&>button]:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.55)]',
                  day_outside: '[&>button]:text-[#536682] [&>button]:opacity-50',
                  day_disabled: '[&>button]:text-[#536682] [&>button]:opacity-40',
                  nav_button:
                    'h-8 w-8 rounded-lg border border-[#1F2B44] bg-[#0D1526] text-[#DDE6F6] opacity-80 hover:bg-[#13213A] hover:opacity-100',
                }}
                formatters={{
                  formatCaption: formatCalendarCaptionPt,
                  formatWeekdayName: formatCalendarWeekdayPt,
                }}
                locale={pt}
                mode="single"
                onSelect={handleDaySelect}
                required
                selected={pendingDay ?? selectedDate ?? undefined}
                weekStartsOn={1}
              />
              ) : (
              <div className={cn('box-border w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-[#182034] bg-[#0D1526]/70', density === 'compact' ? 'p-2 pb-3' : 'p-3 pb-4')}>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[#8399B8]">
                  <Clock aria-hidden="true" className="size-4 text-[#60A5FA]" />
                  Horários disponíveis
                </div>
                {pendingDay ? <p className={'mt-1 text-sm font-semibold text-[#E8EDF8]'}>{formatDatePt(pendingDay)}</p> : null}
                <button className={'mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[#60A5FA]'} onClick={() => setStep('date')} type={'button'}><ArrowLeft className={'size-3.5'} /> Alterar dia</button>
                {timeOptionsLoading ? <p className={'py-8 text-center text-sm text-[#8399B8]'}><LoaderCircle className={'mr-2 inline size-4 animate-spin'} />A carregar horários...</p> : null}
                {!timeOptionsLoading && availableTimeOptions.length === 0 ? <p className={'py-8 text-center text-sm text-[#9AAAC2]'}>{emptyTimeMessage}</p> : null}
                {!timeOptionsLoading && availableTimeOptions.length > 0 ? <div className={cn('grid w-full max-w-full min-w-0 grid-cols-3 sm:grid-cols-4', density === 'compact' ? 'gap-2' : 'gap-2.5')}>
                  {availableTimeOptions.map((option) => {
                    const { disabled: optionDisabled = false, label, time } = option;
                    const selected = time === selectedTime;

                    return (
                      <button
                        className={cn(
                          'inline-flex pointer-events-auto min-w-0 w-full items-center justify-center rounded-lg border px-1.5 text-sm font-semibold transition-colors',
                          density === 'compact' ? 'min-h-8' : 'min-h-9',
                          optionDisabled
                            ? 'cursor-not-allowed border-[#1F2B44] bg-[#091120]/45 text-[#536682] opacity-55'
                            : selected
                              ? 'border-[#60A5FA]/55 bg-[#2563EB] text-white'
                              : 'border-[#1F2B44] bg-[#091120]/70 text-[#DDE6F6] hover:border-[#2563EB]/60 hover:bg-[#13213A]',
                        )}
                        aria-disabled={optionDisabled}
                        disabled={optionDisabled}
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        type="button"
                      >
                        {label ?? time}
                      </button>
                    );
                  })}
                </div> : null}
              </div>
              )}
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
          value={selectedDate ? selectedDate.toISOString() : ''}
        />
      ) : null}

      <button
        aria-controls={popoverId}
        aria-describedby={error ? errorId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-invalid={error || undefined}
        aria-required={ariaRequired}
        className={cn(
          'group flex min-h-11 min-w-0 w-full items-center justify-start gap-2 rounded-xl border border-[#182034] bg-[#0D1526]/90 px-3 py-2.5 text-left text-sm text-[#E8EDF8] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] outline-none transition-all duration-200',
          'hover:border-[#2563EB]/60 hover:bg-[#101A2D]',
          'focus-visible:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-[#F87171]/70 ring-2 ring-[#F87171]/15',
          open && !error && 'border-[#2563EB] bg-[#101A2D] ring-2 ring-[#2563EB]/25',
          buttonClassName,
        )}
        disabled={disabled}
        id={triggerId}
        onClick={toggleOpen}
        type="button"
      >
        <CalendarIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-[#60A5FA]"
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            !selectedDate && 'text-[#8399B8]',
          )}
        >
          {displayValue}
        </span>
        {clearable && selectedDate ? (
          <span
            aria-hidden="true"
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[#8399B8] transition-colors hover:bg-[#182034] hover:text-white"
            onClick={(event) => clearValue(event)}
          >
            <X aria-hidden="true" className="size-3" />
          </span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0 text-[#8399B8] transition-transform duration-200 group-hover:text-[#E8EDF8]',
            open && 'rotate-180 text-[#E8EDF8]',
          )}
        />
      </button>
      {popover}
    </div>
  );
}

function parseDateValue(value?: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function mergeDateAndTime(date: Date, time: string): Date {
  const [hours = '10', minutes = '00'] = time.split(':');
  const nextDate = new Date(date);
  nextDate.setHours(Number(hours), Number(minutes), 0, 0);

  return nextDate;
}

function formatTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function formatCalendarCaptionPt(date: Date): string {
  return date.toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });
}

function formatCalendarWeekdayPt(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()] ?? '';
}

function formatDateTimePt(date: Date): string {
  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDatePt(date: Date): string {
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}







