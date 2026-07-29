export default function Home() {
  return (
    <main className="av-main fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
        <div className="detail-actions" style={{ justifyContent: "center" }}>
          <button className="btn lg pulse">VER BIBLIOTECA</button>
          <button className="btn lg magenta">SALÓN DE LA FAMA</button>
        </div>
      </section>
    </main>
  );
}
