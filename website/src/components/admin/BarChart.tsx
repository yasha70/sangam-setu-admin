/**
 * A small single-series column chart: one hue, thin bars with rounded tops anchored to the
 * baseline, a recessive axis, a hover tooltip on each bar, and a hidden table for screen readers.
 */
export function BarChart({ title, data, unit }: { title: string; data: { date: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((n, d) => n + d.value, 0);
  const label = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return (
    <figure className="chart">
      <figcaption>
        <span>{title}</span>
        <b>{total}</b>
        <small>in the last {data.length} days</small>
      </figcaption>
      <div className="chart-plot" aria-hidden="true">
        <span className="chart-max">{max}</span>
        <div className="chart-bars">
          {data.map((d) => (
            <div key={d.date} className="chart-col" data-tip={`${label(d.date)}: ${d.value} ${unit}`}>
              <i style={{ height: `${(d.value / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="chart-x">
          <span>{label(data[0].date)}</span>
          <span>{label(data[Math.floor(data.length / 2)].date)}</span>
          <span>Today</span>
        </div>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{label(d.date)}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
