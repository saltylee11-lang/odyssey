'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, use, useEffect, useRef, useState, type CSSProperties } from 'react';
import { format } from 'date-fns';
import { searchEntries } from '@/actions/journal';
import { SeaCalendar } from './SeaCalendar';
import type { CloudWord } from './words';
import styles from './atlas.module.css';

type Cloud = { count: number; words: CloudWord[] } | null;
type Result = { id: string; summary: string; content: string; createdAt: string };

function Snippet({ content, term }: { content: string; term: string }) {
  const found = content.toLowerCase().indexOf(term.toLowerCase());
  if (found === -1) return <>{content.slice(0, 110)}{content.length > 110 && '…'}</>;
  const start = Math.max(0, found - 24), end = found + term.length;
  return <>{start > 0 && '…'}{content.slice(start, found)}<mark>{content.slice(found, end)}</mark>{content.slice(end, end + 80)}{end + 80 < content.length && '…'}</>;
}

function SearchResults({ term }: { term: string }) {
  const [results, setResults] = useState<Result[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchEntries(term).then(rows => { if (active) setResults(rows); }).catch(() => { if (active) setFailed(true); });
    }, 240);
    return () => { active = false; clearTimeout(timer); };
  }, [term, attempt]);
  if (failed) return <p className={styles.note} role="status">暂时无法搜索。<button className={styles.textButton} onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>重试</button></p>;
  if (!results) return <p className={styles.note} role="status">正在翻找日记…</p>;
  if (!results.length) return <p className={styles.note} role="status">没有找到「{term}」，可以试试人名、地点或别的词。</p>;
  return <div className={styles.results}><p className={styles.resultCount} role="status">{results.length === 20 ? '显示最近 20 篇' : `找到 ${results.length} 篇日记`}</p><ul>{results.map(entry =>
    <li key={entry.id}><Link href={`/journal/${entry.id}`}><time dateTime={entry.createdAt}>{format(new Date(entry.createdAt), 'yyyy.MM.dd HH:mm')}</time>
      {entry.summary && <strong><Snippet content={entry.summary} term={term} /></strong>}<p><Snippet content={entry.content} term={term} /></p></Link></li>
  )}</ul></div>;
}

function WordCloud({ cloud, select }: { cloud: Promise<Cloud>; select: (word: string) => void }) {
  const result = use(cloud);
  const router = useRouter();
  if (!result) return <p className={styles.note}>暂时无法读取日记。<button className={styles.textButton} onClick={() => router.refresh()}>重新读取</button></p>;
  if (!result.count) return <p className={styles.note}>写下第一篇日记，云图就有了起点。<Link className={styles.textButton} href="/journal/new">去写日记</Link></p>;
  if (!result.words.length) return <p className={styles.note}>已读过 {result.count} 篇日记。一个词出现两次，就有机会在这里浮现。</p>;
  const words = result.words;
  const max = Math.log(words[0].count), min = Math.log(words.at(-1)!.count);
  const rowCount = words.length < 4 ? 1 : words.length < 18 ? 3 : 5;
  const middle = Math.floor(rowCount / 2);
  const rows = Array.from({ length: rowCount }, (_, index) => ({
    capacity: 1 - Math.abs(index - middle) * 0.19,
    width: 0,
    words: [] as Array<CloudWord & { weight: number }>,
  }));
  for (const word of words) {
    const weight = min === max ? 0.55 : (Math.log(word.count) - min) / (max - min);
    const row = rows.reduce((best, next) => {
      const used = next.width / next.capacity, previous = best.width / best.capacity;
      return used < previous || (used === previous && next.capacity > best.capacity) ? next : best;
    });
    const item = { ...word, weight };
    if (row.words.length % 2) row.words.unshift(item);
    else row.words.push(item);
    row.width += word.text.length * (1 + weight * 1.5) + 1;
  }
  return <><p className={styles.cloudCaption}>来自 {result.count.toLocaleString('zh-CN')} 篇日记 · 点一个词，翻回原文</p>
    <div className={styles.cloud} aria-label="日记高频词">{rows.map((row, index) => <div key={index} className={styles.cloudRow}>{row.words.map(({ text, count, weight }) =>
      <button type="button" key={text} aria-label={`${text}，出现 ${count} 次，搜索日记`} title={`${text} · ${count} 次`}
        style={{ '--weight': weight } as CSSProperties} onClick={() => select(text)}>{text}</button>
    )}</div>)}</div></>;
}

export function Atlas({ birthday, cloud }: { birthday: Promise<string | null>; cloud: Promise<Cloud> }) {
  const [query, setQuery] = useState('');
  const term = query.trim();
  const searchHeading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  function selectWord(word: string) {
    setQuery(word);
    searchHeading.current?.focus({ preventScroll: true });
    searchHeading.current?.scrollIntoView({ block: 'start' });
  }
  return <main className={styles.atlas}>
    <header className={styles.masthead}><h1>航海图</h1><nav aria-label="航海图目录"><a href="#compass">指南针</a><a href="#calendar">海历</a><a href="#cloud">云图</a></nav></header>
    <section aria-labelledby="compass" className={styles.section}>
      <h2 id="compass" ref={searchHeading} tabIndex={-1}>指南针</h2>
      <div className={styles.searchBox} role="search"><span className={styles.searchIcon} aria-hidden="true" /><input ref={input} type="search" aria-label="搜索日记" placeholder="搜索日记里的词句…" value={query} onChange={event => setQuery(event.target.value)} />
      {query && <button type="button" aria-label="清空搜索" onClick={() => { setQuery(''); input.current?.focus(); }}>×</button>}</div>
      {term && <SearchResults key={term} term={term} />}
    </section>
    <section aria-labelledby="calendar" className={styles.section}><h2 id="calendar">海历</h2><p className={styles.description}>从出生那天起，把走过的时间涂在格子里。</p>
      <Suspense fallback={<p className={styles.note}>正在展开海历…</p>}><SeaCalendar birthday={birthday} /></Suspense>
    </section>
    <section aria-labelledby="cloud" className={styles.section}><h2 id="cloud">云图</h2>
      <Suspense fallback={<p className={styles.note}>正在整理日记里反复出现的词…</p>}><WordCloud cloud={cloud} select={selectWord} /></Suspense>
    </section>
  </main>;
}
