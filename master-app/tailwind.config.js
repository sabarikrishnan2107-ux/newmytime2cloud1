/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        surface: {
          DEFAULT: '#161b22',
          2: '#1c2128',
        },
        border: {
          DEFAULT: '#21262d',
          2: '#30363d',
        },
        content: {
          DEFAULT: '#e6edf3',
          secondary: '#c9d1d9',
          muted: '#8b949e',
          disabled: '#6e7681',
        },
        accent: {
          DEFAULT: '#7c3aed',
          hover: '#6d28d9',
          dim: 'rgba(124,58,237,0.13)',
          dim2: 'rgba(124,58,237,0.22)',
        },
        success: {
          DEFAULT: '#10b981',
          dim: 'rgba(16,185,129,0.12)',
        },
        error: {
          DEFAULT: '#ef4444',
          dim: 'rgba(239,68,68,0.12)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          dim: 'rgba(245,158,11,0.12)',
        },
        info: {
          DEFAULT: '#0ea5e9',
          dim: 'rgba(14,165,233,0.12)',
        },
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        '2xs': '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
        md: '14px',
        lg: '15px',
        xl: '16px',
        '2xl': '18px',
        '3xl': '22px',
      },
      spacing: {
        header: '54px',
        sidebar: '220px',
      },
    },
  },
  plugins: [],
}
