// 상장 창: 아이 이름을 받아 상장 그림을 만들고, 사진으로 저장할 수 있게 한다
import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { drawCertificate, saveCertificate } from '../../rewards/certificate';
import { loadRewards, saveName } from '../../rewards/store';

interface Props {
  /** 몇 번째 완성인지 (상장에 적는다) */
  solves: number;
  onClose: () => void;
}

// 이름 입력 → 상장 미리보기 → 저장 순서로 보여준다
export function CertificateSheet({ solves, onClose }: Props) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(() => loadRewards().name);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [saved, setSaved] = useState(false);

  // 이름을 저장하고 상장 그림을 만든다
  async function make() {
    if (!name.trim()) return;
    saveName(name);
    const date = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const drawn = await drawCertificate({
      title: t('certTitle'),
      name: t('certNameLine', { name: name.trim() }),
      body: [t('certBody1'), t('certBody2'), t('certBody3')],
      count: t('certCount', { n: solves }),
      date,
      from: t('certFrom'),
    });
    setCanvas(drawn);
  }

  // 저장해 둔 이름이 있으면 바로 상장을 만들어 보여준다
  useEffect(() => {
    if (name.trim()) make();
    // 처음 열 때 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상장 그림을 기기에 저장한다
  async function save() {
    if (!canvas) return;
    await saveCertificate(canvas, `${t('certFile')}-${name.trim()}`);
    setSaved(true);
  }

  return (
    <div className="reward-overlay" role="dialog" aria-modal="true">
      <div className="reward-card cert">
        {canvas ? (
          <>
            <img className="cert-preview" src={canvas.toDataURL('image/png')} alt={t('certTitle')} />
            <button className="btn primary big" onClick={save}>{t('certSave')}</button>
            {saved && <p className="hint">{t('certSaved')}</p>}
            <button className="link" onClick={() => setCanvas(null)}>✏️ {t('certNameAsk')}</button>
          </>
        ) : (
          <>
            <h2>{t('certNameAsk')}</h2>
            <input
              className="cert-name"
              value={name}
              maxLength={12}
              placeholder={t('certNamePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && make()}
              autoFocus
            />
            <button className="btn primary big" disabled={!name.trim()} onClick={make}>{t('certMake')}</button>
          </>
        )}
        <button className="btn small" onClick={onClose}>{t('certClose')}</button>
      </div>
    </div>
  );
}
