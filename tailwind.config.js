/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    "bg-green-500", "bg-amber-500", "bg-red-500", "bg-orange-500", "bg-yellow-500",
    "text-green-600", "text-amber-600", "text-red-600", "text-orange-600", "text-yellow-600",
    "border-green-300", "border-amber-300", "border-red-300", "border-orange-300", "border-yellow-300",
    "bg-green-50", "bg-amber-50", "bg-red-50", "bg-orange-50", "bg-yellow-50",
    "bg-green-100", "bg-amber-100", "bg-red-100", "bg-orange-100", "bg-yellow-100",
    "text-green-700", "text-amber-700", "text-red-700", "text-orange-700", "text-yellow-700",
    "border-green-200", "border-amber-200", "border-red-200", "border-orange-200", "border-yellow-200",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)"],
      },
      textColor: {
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-muted": "hsl(var(--text-muted))",
      },
      colors: {
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        "surface-muted": "hsl(var(--surface-muted))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        orbit: {
          green: "hsl(var(--orbit-green))",
          amber: "hsl(var(--orbit-amber))",
          red: "hsl(var(--orbit-red))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};