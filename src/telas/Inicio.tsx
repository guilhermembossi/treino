// Tela inicial. O cartão "Próximo treino" de verdade chega na tarefa 5.1.
export default function Inicio() {
  return (
    <>
      <h1>Olá!</h1>
      <section className="cartao">
        <p className="rotulo">Próximo treino</p>
        <p>As fichas e o treino do dia chegam nas próximas etapas.</p>
        <button className="botao-primario" disabled>Começar treino</button>
      </section>
    </>
  );
}
