import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'destructive' | 'outline' | 'ghost' | 'gold'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none'

  const variants = {
    default:
      'bg-[#13161b] text-[#f6f4ef] hover:bg-[#232934] focus:ring-[#a87b24] shadow-sm',
    primary:
      'bg-[#13161b] text-[#f6f4ef] hover:bg-[#232934] focus:ring-[#a87b24] shadow-sm',
    gold:
      'bg-[#a87b24] text-white hover:bg-[#8e661c] focus:ring-[#a87b24] shadow-sm',
    secondary:
      'bg-[#ece7dc] text-[#16181d] hover:bg-[#e1dacb] focus:ring-[#a87b24]',
    danger:
      'bg-[#b91c1c] text-white hover:bg-[#991b1b] focus:ring-[#b91c1c] shadow-sm',
    destructive:
      'bg-[#b91c1c] text-white hover:bg-[#991b1b] focus:ring-[#b91c1c] shadow-sm',
    outline:
      'border border-[#cfc7b6] bg-white text-[#16181d] hover:bg-[#f6f4ef] hover:border-[#a87b24] focus:ring-[#a87b24]',
    ghost:
      'text-[#374151] hover:bg-[#ece7dc]/70 hover:text-[#13161b] focus:ring-[#a87b24]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
    icon: 'h-9 w-9 p-0',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
