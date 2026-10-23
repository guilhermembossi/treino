import { marca, logoSvg } from '../config/marca';

const src = `data:image/svg+xml,${encodeURIComponent(logoSvg(marca.icone.fundo, marca.icone.desenho))}`;

export default function Logo({ tamanho }: { tamanho: number }) {
  return <img className="logo" src={src} alt="" width={tamanho} height={tamanho} />;
}
