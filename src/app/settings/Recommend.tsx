'use client';

import { useState } from 'react';
import styles from './settings.module.css';

const homepage = 'https://odyssey-moonlit.netlify.app/';

export function Recommend() {
  const [feedback, setFeedback] = useState('');
  const [manual, setManual] = useState(false);
  async function share() {
    setFeedback('');
    setManual(false);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: '奥德赛 Odyssey', text: '一本可以安静记录、回看生活的日记。', url: homepage });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(homepage);
      setFeedback('首页链接已复制，可以发给朋友了。');
    } catch {
      setManual(true);
    }
  }
  return <section className={styles.section} aria-labelledby="about-odyssey">
    <h2 id="about-odyssey">关于奥德赛</h2>
    <div className={styles.panel}>
      <button type="button" className={styles.secondary} onClick={share}>推荐给朋友 <span aria-hidden="true">↗</span></button>
      <p role="status">{feedback}</p>
      {manual && <label className={styles.shareLink}>复制这个首页链接发给朋友
        <span className={styles.inline}><input aria-label="奥德赛首页链接" readOnly value={homepage} onFocus={e => e.currentTarget.select()} /></span>
      </label>}
    </div>
  </section>;
}
