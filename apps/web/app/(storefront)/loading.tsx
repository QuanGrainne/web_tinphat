/** Shown at once while a storefront page loads, so a click always answers immediately. */
export default function Loading() {
  return (
    <main className="wrap tp-skel" aria-busy="true" aria-label="Đang tải">
      <div className="tp-skel-line" style={{ width: 180, marginTop: 16 }} />
      <div className="tp-skel-line tp-skel-title" />
      <div className="grid grid-4 tp-skel-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="card" aria-hidden="true">
            <div className="ph tp-skel-box" />
            <div className="card-b">
              <div className="tp-skel-line" />
              <div className="tp-skel-line" style={{ width: "55%" }} />
              <div className="tp-skel-line tp-skel-btn" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
