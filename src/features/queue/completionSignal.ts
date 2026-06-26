import { END_SIGNAL_MAX_CHARS } from '../../shared/constants';
import { normalizeText } from '../../shared/format';

export function isCompletionSignal(text: string): boolean {
  const raw = normalizeText(text);
  if (!raw) return false;

  const candidates = raw
    .split(/[\n\r。！？!?；;：:]+/)
    .map(item => item.trim())
    .filter(Boolean);
  candidates.push(raw);

  return candidates.some(item => {
    const compact = normalizeText(item)
      .replace(/\s+/g, '')
      .replace(/[“”"'`‘’【】\[\]（）(){}<>《》、，,。.:：!！?？;；~～—\-]/g, '');

    if (!compact || compact.length > END_SIGNAL_MAX_CHARS) return false;
    if (/(未完成|尚未完成|没有完成|没完成|未结束|没结束|尚未结束|无法完成|不能完成|完成不了)/.test(compact)) return false;

    return /^(?:输出|任务|整理|回答|队列|全部|所有|本轮|本次|执行|生成|处理|发送)?(?:已)?(?:完成|完毕|结束)(?:了|啦)?$/.test(compact);
  });
}
