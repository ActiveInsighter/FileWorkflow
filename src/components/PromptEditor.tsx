import { useMemo, useState, type CSSProperties } from 'react';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPromptHighlight(text: string): string {
  const raw = String(text || '');
  if (!raw) return ' ';

  const token = /(https:\/\/[^\s<>]+|[<>])/gi;
  let html = '';
  let last = 0;
  raw.replace(token, (match, _token, offset) => {
    html += escapeHtml(raw.slice(last, offset));
    const cls = /^https:\/\//i.test(match) ? 'fw-pq-url-token' : 'fw-pq-angle-token';
    html += `<span class="${cls}">${escapeHtml(match)}</span>`;
    last = offset + match.length;
    return match;
  });
  html += escapeHtml(raw.slice(last));
  return html || ' ';
}

interface PromptEditorProps {
  value: string;
  lineCount: number;
  onChange: (value: string) => void;
}

export function PromptEditor({ value, lineCount, onChange }: PromptEditorProps) {
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const highlighted = useMemo(() => renderPromptHighlight(value), [value]);

  return (
    <div className="fw-pq-field">
      <label className="fw-pq-label" htmlFor="fileworkflow-chatgpt-queue-input">
        <b>消息队列</b>
        <span>共 {lineCount} 行</span>
      </label>
      <div
        className="fw-pq-input-shell"
        style={{
          '--fw-pq-input-scroll-x': `${-scroll.x}px`,
          '--fw-pq-input-scroll-y': `${-scroll.y}px`
        } as CSSProperties}
      >
        <pre className="fw-pq-input-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlighted }} />
        <textarea
          id="fileworkflow-chatgpt-queue-input"
          className="fw-pq-input"
          spellCheck={false}
          wrap="off"
          value={value}
          placeholder="一行一条消息；长链接/长消息横向滚动；可用 --- 分隔多行消息"
          onInput={event => {
            const target = event.currentTarget;
            setScroll({ x: target.scrollLeft, y: target.scrollTop });
          }}
          onScroll={event => {
            const target = event.currentTarget;
            setScroll({ x: target.scrollLeft, y: target.scrollTop });
          }}
          onChange={event => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
