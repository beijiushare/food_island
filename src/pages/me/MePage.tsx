import { Card, Footer } from 'animal-island-ui';
import { useTranslation } from 'react-i18next';

export function MePage() {
  const { t } = useTranslation();

  return (
    <div className="page ac-fade-up">
      <h1 className="page__title">{t('me.title')}</h1>
      <Card>
        <p>{t('me.placeholder')}</p>
      </Card>
      <Footer type="tree" />
    </div>
  );
}
