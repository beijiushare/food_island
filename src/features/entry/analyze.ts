import { getEntry, updateEntry } from '../../data/dao/diary';
import { getPhotoByEntry } from '../../data/dao/photos';
import { getAIProfile } from '../../data/dao/settings';
import { loadFoodIndex } from '../../data/foods';
import { photoDataUrl } from '../../services/photo';
import { analyzeDish, mockDish, resolveDish, type DishDraft } from '../ai/recognize';

/**
 * 把一条「识别中」的记录补完：照片 → AI 拆组成 → 本地查表 → 写回。
 * 失败只改状态，不删记录——照片和这条记录都还在。
 */
export async function analyzeEntry(entryId: string): Promise<void> {
  const entry = await getEntry(entryId);
  if (!entry) return;

  try {
    const profile = await getAIProfile();
    let dish: DishDraft | null = null;

    if (profile.apiKey) {
      const ref = await getPhotoByEntry(entryId);
      const url = ref ? await photoDataUrl(ref.relPath) : null;
      dish = await analyzeDish(profile, { photoDataUrls: url ? [url] : [] });
    } else if (import.meta.env.DEV) {
      // 开发环境没有 Key 时给示例结果，正式包不允许塞假数据
      dish = mockDish();
    } else {
      throw new Error('还没配置 AI');
    }

    if (!dish) throw new Error('没认出这道菜');

    const index = await loadFoodIndex();
    const resolved = resolveDish(index, dish);

    await updateEntry(entryId, {
      name: resolved.name,
      grams: resolved.grams,
      nutrients: resolved.nutrients,
      components: resolved.components,
      status: 'ready',
      pending: false,
    });
  } catch (error) {
    await updateEntry(entryId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
