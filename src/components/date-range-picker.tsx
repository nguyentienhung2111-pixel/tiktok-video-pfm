'use client';

import * as React from 'react';
import { addDays, format, subDays, startOfToday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const presets = [
    {
      label: 'Hôm nay',
      getValue: () => ({
        from: startOfToday(),
        to: startOfToday(),
      }),
    },
    {
      label: '7 ngày qua',
      getValue: () => ({
        from: subDays(startOfToday(), 7),
        to: startOfToday(),
      }),
    },
    {
      label: '28 ngày qua',
      getValue: () => ({
        from: subDays(startOfToday(), 28),
        to: startOfToday(),
      }),
    },
    {
      label: '90 ngày qua',
      getValue: () => ({
        from: subDays(startOfToday(), 90),
        to: startOfToday(),
      }),
    },
    {
      label: 'Tất cả thời gian',
      getValue: () => ({
        from: subDays(startOfToday(), 365 * 2), // 2 years back
        to: addDays(startOfToday(), 1),
      }),
    },
  ];

  const handleSelectPreset = (getValue: () => DateRange) => {
    setDate(getValue());
    setOpen(false);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            size="sm"
            className={cn(
              'w-fit justify-start text-left font-normal bg-background border-[#30363d] text-foreground hover:bg-accent hover:text-accent-foreground',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yyyy')} - {format(date.to, 'dd/MM/yyyy')}
                </>
              ) : (
                format(date.from, 'dd/MM/yyyy')
              )
            ) : (
              <span>Chọn thời gian</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 flex flex-col md:flex-row bg-[#161b22] border border-[#30363d] shadow-2xl z-50" 
          align="end"
          sideOffset={8}
        >
          <div className="flex flex-col border-b md:border-b-0 md:border-r border-[#30363d] p-3 space-y-1 min-w-[140px]">
            <p className="text-[10px] uppercase font-bold text-muted-foreground px-2 mb-2 tracking-wider">Lọc nhanh</p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start font-normal hover:bg-[#1f2937] text-foreground"
                onClick={() => handleSelectPreset(preset.getValue)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-1">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={vi}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
