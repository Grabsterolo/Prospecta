export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12181F',
        panel: '#1B242E',
        panel2: '#212C38',
        brass: '#C9974C',
        brassDim: '#8A6A38',
        signal: '#7FA98C',
        alert: '#B5563B',
        parchment: '#EDE7D9',
        parchmentDim: '#9CA3A8',
        hairline: '#2B3642',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
