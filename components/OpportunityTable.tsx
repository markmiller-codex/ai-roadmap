import type { Opportunity } from "@/types/assessment";

export function OpportunityTable({ opportunities }: { opportunities: Opportunity[] }) {
  return <section className="panel wide"><div className="panel-title"><h2>AI opportunity matrix</h2><span>{opportunities.length} scored</span></div>
    {!opportunities.length ? <p className="muted">Complete workflow discovery to generate opportunities.</p> :
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Opportunity</th><th>Score</th><th>Classification</th><th>Phase</th></tr></thead>
      <tbody>{opportunities.slice(0, 10).map((item, index) => <tr key={`${item.opportunity_name}-${index}`}><td>{index + 1}</td><td><strong>{item.opportunity_name}</strong><small>{item.description}</small></td><td>{item.total_score}</td><td><span className="classification">{item.classification}</span></td><td>{item.recommended_phase}</td></tr>)}</tbody></table></div>}
  </section>;
}
