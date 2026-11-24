import { Button, Input } from 'animal-island-ui';

import { CameraIcon, PencilIcon } from '../../../components/icons/ActionIcons';
import type { EntryForm } from './useEntryForm';

export function PickView({ form }: { form: EntryForm }) {
  const { t, query, target, recent, photoPreview, photoMeta, busy } = form;

  return (
    <div className="pick">
      <Button
        type="default"
        block
        loading={form.capturing}
        icon={<CameraIcon />}
        onClick={form.takePhoto}
      >
        {t('entry.photo')}
      </Button>

      {photoPreview ? (
        <div className="photo">
          <img className="photo__img" src={photoPreview} alt="" />
          <div className="photo__side">
            <span className="photo__meta">
              {photoMeta
                ? `${photoMeta.width}×${photoMeta.height} · ${Math.round(photoMeta.bytes / 1024)} KB`
                : ''}
            </span>
            <button
              type="button"
              className="photo__remove"
              onClick={form.removePhoto}
              disabled={busy}
            >
              {t('entry.removePhoto')}
            </button>
          </div>
        </div>
      ) : null}

      {photoPreview ? (
        <Button type="primary" block loading={form.recognizing} onClick={form.runRecognition}>
          {form.hasKey === false ? t('entry.recognizeMock') : t('entry.recognize')}
        </Button>
      ) : null}

      {photoPreview ? (
        <p className="photo__hint">
          {target?.pending ? t('entry.pendingHint') : t('entry.photoNotReady')}
        </p>
      ) : null}
      {form.aiNotice ? <p className="photo__notice">{form.aiNotice}</p> : null}
      {form.notice ? <p className="photo__notice">{form.notice}</p> : null}

      {!query.trim() && !target && recent.length > 0 ? (
        <>
          <p className="pick__section">{t('entry.recent')}</p>
          <div className="recent">
            {recent.map((memory) => (
              <button
                key={memory.id}
                type="button"
                className="recent__chip"
                disabled={busy}
                onClick={() => form.quickAdd(memory.foodKey, memory.grams, memory.portion)}
              >
                <span className="recent__name">{memory.name}</span>
                <span className="recent__grams">{Math.round(memory.grams)} g</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <Input
        size="large"
        allowClear
        autoFocus={recent.length === 0}
        value={query}
        placeholder={t('entry.searchPlaceholder')}
        onChange={(e) => form.setQuery(e.target.value)}
        onClear={() => form.setQuery('')}
      />
      <p className="pick__hint">
        {query.trim() ? t('search.hint', { count: form.hits.length }) : t('entry.pickHint')}
      </p>
      <ul className="pick__list">
        {form.hits.map((hit) => (
          <li key={hit.item.code}>
            <button type="button" className="pick__row" onClick={() => form.pick(hit.item)}>
              <span className="pick__main">
                <span className="pick__name">{hit.item.name}</span>
                <span className="pick__meta">
                  {hit.item.cat2 || hit.item.cat1}
                  {hit.item.state ? ` · ${hit.item.state}` : ''}
                </span>
              </span>
              <span className="pick__kcal">
                {Math.round(hit.item.nut.kcal ?? 0)}
                <span className="pick__unit">/100g</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {query.trim() && form.hits.length === 0 ? (
        <p className="pick__empty">{t('search.empty')}</p>
      ) : null}

      {!query.trim() && !target ? (
        <Button type="text" block icon={<PencilIcon />} onClick={() => form.setMode('sentence')}>
          {t('entry.sentence')}
        </Button>
      ) : null}
    </div>
  );
}
