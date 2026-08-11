'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-full w-9 h-9 shrink-0 relative transition-colors focus-visible:outline-none">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-slate-700 dark:text-slate-300" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-700 dark:text-slate-300" />
        <span className="sr-only">تغيير المظهر</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          فاتح
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          داكن
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          حسب النظام
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
