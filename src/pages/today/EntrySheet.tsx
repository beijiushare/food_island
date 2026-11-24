import { Sheet } from '../../components/Sheet/Sheet';
import { DetailView } from './entry/DetailView';
import { PickView } from './entry/PickView';
import { SentenceView } from './entry/SentenceView';
import { useEntryForm, type EntrySheetProps } from './entry/useEntryForm';
import './EntrySheet.css';

/**
 * 录入弹窗容器：只负责「当前该显示哪个视图」。
 * 状态与业务逻辑在 entry/useEntryForm.ts，三个视图各自只渲染。
 */
export function EntrySheet(props: EntrySheetProps) {
  const form = useEntryForm(props);
  const title = form.target ? form.t('entry.editTitle') : form.t('entry.title');

  return (
    <Sheet open={props.open} onClose={props.onClose} title={title}>
      {form.picked ? (
        <DetailView form={form} />
      ) : form.mode === 'sentence' || form.mode === 'review' ? (
        <SentenceView form={form} />
      ) : (
        <PickView form={form} />
      )}
    </Sheet>
  );
}
