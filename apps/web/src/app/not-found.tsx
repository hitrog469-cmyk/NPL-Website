import Link from "next/link";

export default function NotFound() {
  return (
    <section className="ink">
      <div className="wrap page-head" style={{ paddingBottom: 72 }}>
        <p className="label muted">404</p>
        <h1 className="display">Not on the card</h1>
        <p className="lead muted">That page doesn&rsquo;t exist. <Link href="/">Back to the home page</Link>.</p>
      </div>
    </section>
  );
}
