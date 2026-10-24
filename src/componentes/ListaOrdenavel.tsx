import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type Announcements, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { IconeAlca } from '../icones';

// Lista que se reordena arrastando pela alça (dedo ou mouse). No teclado, com a alça em foco,
// as setas ↑ ↓ movem o item uma posição (o modo de teclado da biblioteca falhava com cartões altos).
// `render` recebe a alça pronta para pôr onde quiser no item.
export default function ListaOrdenavel<T extends { id: string }>({ itens, nome, aoMover, render, className }: {
  itens: T[];
  nome: (item: T) => string;              // para o leitor de tela e o rótulo da alça
  aoMover: (deId: string, paraId: string) => void;
  render: (item: T, alca: ReactNode) => ReactNode;
  className?: string;
}) {
  const sensores = useSensors(useSensor(PointerSensor));
  const [aviso, setAviso] = useState('');
  const nomeDe = (id: string | number) => { const i = itens.find((x) => x.id === id); return i ? nome(i) : ''; };
  const posicao = (id: string | number) => itens.findIndex((x) => x.id === id) + 1;

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `${nomeDe(active.id)} pego. Posição ${posicao(active.id)} de ${itens.length}.`,
    onDragOver: ({ active, over }) => (over ? `${nomeDe(active.id)} na posição ${posicao(over.id)} de ${itens.length}.` : ''),
    onDragEnd: ({ active, over }) => (over ? `${nomeDe(active.id)} solto na posição ${posicao(over.id)}.` : ''),
    onDragCancel: ({ active }) => `Cancelado. ${nomeDe(active.id)} voltou ao lugar.`,
  };

  const aoSoltar = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) aoMover(String(active.id), String(over.id));
  };

  const porTeclado = (i: number, e: KeyboardEvent) => {
    const alvo = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1;
    if (alvo < 0 || alvo >= itens.length) return;
    e.preventDefault();
    aoMover(itens[i].id, itens[alvo].id);
    setAviso(`${nome(itens[i])}: posição ${alvo + 1} de ${itens.length}.`);
  };

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{ announcements: anuncios }}>
      <SortableContext items={itens.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={className ?? 'lista'}>
          {itens.map((item, i) => (
            <ItemOrdenavel key={item.id} id={item.id} rotulo={`Mover ${nome(item)}, posição ${i + 1} de ${itens.length}`}
              aoTeclar={(e) => porTeclado(i, e)}>
              {(alca) => render(item, alca)}
            </ItemOrdenavel>
          ))}
        </ul>
      </SortableContext>
      <span className="so-leitor" aria-live="polite">{aviso}</span>
    </DndContext>
  );
}

function ItemOrdenavel({ id, rotulo, aoTeclar, children }: {
  id: string; rotulo: string; aoTeclar: (e: KeyboardEvent) => void; children: (alca: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const estilo: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 5 : undefined,
  };
  const alca = (
    <button type="button" ref={setActivatorNodeRef} className="alca" aria-label={rotulo}
      title="Arraste (ou use as setas ↑ ↓) para mudar a ordem"
      {...attributes} aria-roledescription="alça de ordenação" aria-describedby={undefined}
      {...listeners} onKeyDown={aoTeclar}>
      <IconeAlca />
    </button>
  );
  return <li ref={setNodeRef} style={estilo} className={isDragging ? 'arrastando' : undefined}>{children(alca)}</li>;
}
