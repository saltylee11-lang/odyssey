'use client';

import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, saveAvatar, updateProfile } from '@/actions/profile';
import { getAllEntries } from '@/actions/journal';
import { createClient } from '@/lib/auth/client';
import { prepareAvatar } from '@/lib/avatar';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import styles from './settings.module.css';

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
export function Settings({ profile, entryCount, version }: { profile: Profile; entryCount: number | null; version: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const db = createClient();
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState(profile.avatar);
  const [busy, setBusy] = useState('');
  const lock = useRef(false);
  const [dataNote, setDataNote] = useState('');
  const photoFile = useRef<HTMLInputElement>(null);
  const backupFile = useRef<HTMLInputElement>(null);
  async function run(action: string, task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(action);
    try { await task(); } catch (e) { toast(e instanceof Error ? e.message : '操作失败，请重试。', 'error'); }
    finally { lock.current = false; setBusy(''); }
  }
  function choosePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (file) void run('photo', async () => setPhoto(await prepareAvatar(file)));
  }
  function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    void run('import', async () => {
      setDataNote('正在核对文件…');
      try {
        const data = JSON.parse(await file.text());
        let added: number;
        if (data?.format === 'ibetter-presence-v1') {
          const { importPresence } = await import('@/lib/import-presence');
          added = (await importPresence(db, data)).inserted;
        } else {
          const { restoreJournal } = await import('@/lib/restore-journal');
          added = await restoreJournal(db, data, profile);
        }
        setDataNote(`导入完成，新增 ${added} 篇日记。`);
        router.refresh();
      } catch (error) { setDataNote(error instanceof SyntaxError ? '文件无法读取，请选择 JSON 备份。' : error instanceof Error ? error.message : '导入失败。'); }
    });
  }
  async function exportFile() {
    const entries = await getAllEntries();
    const { id, email, birthdate, name } = profile;
    const blob = new Blob([JSON.stringify({ profile: { id, email, birthdate, name }, entries })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `odyssey-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDataNote(`已生成备份，共 ${entries.length} 篇日记。`);
  }
  const differentPhoto = photo !== profile.avatar;
  return <main className={styles.page}>
    <header className={styles.header}><h1>设置</h1></header>
    <section className={styles.section} aria-labelledby="personal"><h2 id="personal">个人资料</h2>
      <div className={styles.panel}>
        <div className={styles.identity}><Avatar photo={photo} name={profile.name} /><div><h3>{profile.name}</h3>
          <div className={styles.links}><button disabled={!!busy} onClick={() => photoFile.current?.click()}>{busy === 'photo' ? '读取中…' : '更换头像'}</button>
          {photo && <button disabled={!!busy} onClick={() => setPhoto(null)}>恢复默认头像</button>}</div></div>
        </div>
        <input type="file" hidden ref={photoFile} aria-label="选择头像图片" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
        {differentPhoto && <div className={styles.inline}><button className={styles.primary} disabled={!!busy} onClick={() => run('avatar', async () => {
          await saveAvatar(photo); router.refresh(); toast('头像已保存', 'success');
        })}>{busy === 'avatar' ? '保存中…' : '保存头像'}</button><button className={styles.secondary} disabled={!!busy} onClick={() => setPhoto(profile.avatar)}>取消</button></div>}
        <form className={styles.nameForm} onSubmit={e => { e.preventDefault(); void run('name', async () => {
          const trimmed = name.trim(); await updateProfile({ name: trimmed }); setName(trimmed); router.refresh(); toast('昵称已保存', 'success');
        }); }}><label htmlFor="nickname">昵称</label><div className={styles.inline}><input id="nickname" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} disabled={!!busy} />
        <button className={styles.secondary} disabled={!!busy || !name.trim() || name.trim() === profile.name}>{busy === 'name' ? '保存中…' : '保存昵称'}</button></div></form>
        <dl className={styles.facts}><div><dt>出生日期</dt><dd>{profile.birthdate}</dd></div><div><dt>登录邮箱</dt><dd>{profile.email}</dd></div></dl>
      </div>
    </section>
    <section id="ai" className={styles.section} aria-labelledby="ai-title"><h2 id="ai-title">AI 对话</h2><div className={styles.panel}><KeySettings /></div></section>
    <section className={styles.section} aria-labelledby="data-title"><h2 id="data-title">日记数据</h2><div className={styles.panel}>
      <div className={styles.dataTitle}><h3>日记备份</h3>{entryCount !== null && <span>{entryCount.toLocaleString('zh-CN')} 篇日记</span>}</div>
      <p>导出正文、摘要和标签。可导入 Odyssey 备份或 iBetter「存在」文件。</p>
      <div className={styles.inline}><button className={styles.secondary} disabled={!!busy} onClick={() => run('export', exportFile)}>{busy === 'export' ? '导出中…' : '导出备份'}</button>
      <button className={styles.secondary} disabled={!!busy} onClick={() => backupFile.current?.click()}>{busy === 'import' ? '导入中…' : '导入文件'}</button></div>
      <input ref={backupFile} hidden type="file" aria-label="选择日记备份" accept=".json,application/json" onChange={importFile} />
      <p role="status">{dataNote}</p>
    </div></section>
    <footer className={styles.footer}><span>奥德赛 · v{version}</span><button disabled={!!busy} onClick={() => run('logout', async () => {
      const { error } = await db.auth.signOut({ scope: 'local' });
      if (error) throw Error('退出失败，请重试。');
      localStorage.removeItem('odyssey_api_key'); window.location.replace('/');
    })}>{busy === 'logout' ? '正在退出…' : '退出登录'}</button></footer>
  </main>;
}

function KeySettings() {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const stored = useSyncExternalStore(subscribeKey, () => Boolean(localStorage.getItem('odyssey_api_key')), () => null);
  function save(key: string) {
    try {
      if (key) localStorage.setItem('odyssey_api_key', key); else localStorage.removeItem('odyssey_api_key');
      window.dispatchEvent(new Event('odyssey-key')); setDraft(''); setEditing(false); toast(key ? '密钥已保存' : '密钥已移除', 'success');
    } catch { toast('浏览器无法保存密钥。', 'error'); }
  }
  return <div><h3>DeepSeek 密钥</h3><p>密钥仅保存在当前浏览器。写日记无需连接 AI。</p>
    {stored === true && !editing ? <div className={styles.inline}><span className={styles.keyState}>已保存密钥</span>
      <button className={styles.secondary} onClick={() => setEditing(true)}>更换</button><button onClick={() => save('')}>移除密钥</button></div> :
      stored !== null && <form className={styles.inline} onSubmit={e => { e.preventDefault(); if (draft.trim()) save(draft.trim()); }}>
        <input aria-label="DeepSeek 密钥" type="password" autoComplete="off" placeholder="输入密钥 sk-…" value={draft} onChange={e => setDraft(e.target.value)} />
        <button className={styles.secondary} disabled={!draft.trim()}>保存密钥</button>{editing && <button type="button" onClick={() => { setDraft(''); setEditing(false); }}>取消</button>}
      </form>}</div>;
}

function subscribeKey(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener('odyssey-key', update);
  return () => { window.removeEventListener('storage', update); window.removeEventListener('odyssey-key', update); };
}
