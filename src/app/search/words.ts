const stopWords = new Set(`一个 一些 一点 一下 一直 一种 一次 一天 一起 一样 自己 我们 你们 他们 她们 它们 大家 别人 什么 这么 那么 这个 那个 这些 那些 这样 那样 怎么 为什么 然后 之后 后来 已经 还是 就是 只是 可以 应该 可能 觉得 感觉 因为 所以 但是 不过 其实 虽然 而且 还有 这里 那里 时候 今天 昨天 明天 现在 开始 进行 对于 非常 比较 有点 没有 不是 真的 the and that this with for from have has had was were are is to of in on it as at my me we you he she they but so just then today about some really very`.split(/\s+/));
const singleWords = new Set('家 梦 海 雨 风 雪 花 书 猫 狗 爱 山 酒 光 夜 跑 画 歌 爸 妈'.split(' '));

export type CloudWord = { text: string; count: number };

export function frequentWords(entries: ReadonlyArray<{ content: string }>): CloudWord[] {
  const counts = new Map<string, number>();
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  for (const { content } of entries) {
    for (const { segment, isWordLike } of segmenter.segment(content)) {
      if (!isWordLike) continue;
      const word = segment.toLowerCase();
      if (stopWords.has(word) || word.length === 1 && !singleWords.has(word)) continue;
      if (!/\p{L}/u.test(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([text, count]) => ({ text, count }))
    .filter(word => word.count >= 2)
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'zh-CN'))
    .slice(0, 32);
}
