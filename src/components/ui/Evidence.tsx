import { getSource } from '@/data/sources';
import { Badge } from './Primitives';

export function Evidence({ sourceIds, title = 'Sources & applicability', conditions = [] }: { sourceIds: readonly string[]; title?: string; conditions?: readonly string[] }) {
  return <details className="disclosure evidence-disclosure"><summary>{title}</summary><div className="detail-copy">{conditions.length > 0 && <ul>{conditions.map(condition => <li key={condition}>{condition}</li>)}</ul>}</div><div className="evidence-list">{[...new Set(sourceIds)].map(id => {
    const source = getSource(id);
    if (!source) return <p key={id}>No reviewed source record is available for {id}.</p>;
    return <div className="evidence-item" key={id}>
      <Badge tone={source.status === 'unverified' ? 'warning' : 'neutral'}>{source.status === 'verified' ? 'Stated claim checked' : source.status === 'conditional' ? 'Conditional evidence' : 'Unverified assumption'}</Badge>
      <p>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : <strong>{source.title}</strong>}</p>
      <small>{source.publisher} · reviewed {source.reviewedAt}{source.effectiveDate ? ` · effective ${source.effectiveDate}` : ''}</small>
      <p>{source.section}</p>
      <ul>{source.conditions.map(condition => <li key={condition}>{condition}</li>)}</ul>
      <small>{source.currency ? `${source.currency} · ` : ''}{source.unit} · {source.term} · {source.region}</small>
    </div>;
  })}</div></details>;
}
