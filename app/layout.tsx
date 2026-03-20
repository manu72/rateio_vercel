import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rateio — Currency Converter',
  description: 'Live currency conversion with historical charts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-100 dark:bg-slate-950 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
