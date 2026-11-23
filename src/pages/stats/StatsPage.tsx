import { Card, Footer, Tabs } from 'animal-island-ui';
import { useTranslation } from 'react-i18next';

export function StatsPage() {
  const { t } = useTranslation();

  return (
    <div className="page ac-fade-up">
      <h1 className="page__title">{t('stats.title')}</h1>
      <Tabs
        items={[
          {
            key: 'week',
            label: t('stats.week'),
            children: (
              <Card type="dashed">
                <p>{t('stats.placeholder')}</p>
              </Card>
            ),
          },
          {
            key: 'month',
            label: t('stats.month'),
            children: (
              <Card type="dashed">
                <p>{t('stats.placeholder')}</p>
              </Card>
            ),
          },
        ]}
        defaultActiveKey="week"
      />
      <Footer type="sea" />
    </div>
  );
}
