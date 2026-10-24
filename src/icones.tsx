// Ícones de linha (24×24), na cor do texto.
const props = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
};

export const IconeInicio = () => (
  <svg {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>
);

export const IconeHistorico = () => (
  <svg {...props}><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
);

export const IconeFichas = () => (
  <svg {...props}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>
);

export const IconeAlca = () => (
  <svg {...props} strokeWidth={0} fill="currentColor">
    {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />))}
  </svg>
);

export const IconeSeta = () => (
  <svg {...props}><path d="m9 6 6 6-6 6" /></svg>
);

export const IconeVoltar = () => (
  <svg {...props}><path d="m15 6-6 6 6 6" /></svg>
);

export const IconeX = () => (
  <svg {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export const IconeMais = () => (
  <svg {...props}><path d="M12 5v14M5 12h14" /></svg>
);

export const IconeLua = () => (
  <svg {...props}><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.5 6.5 0 0 0 11 11Z" /></svg>
);

export const IconeSol = () => (
  <svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
