import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

/**
 * 图片管线（技术文档 §5.8）：
 *   拍/选 → 长边 800 + JPEG 0.8 → App 私有目录 photos/YYYY/MM/<uuid>.jpg
 *   数据库只存相对路径，绝不把图片塞 IndexedDB。
 */

export interface PhotoDraft {
  relPath: string;
  width: number;
  height: number;
  bytes: number;
}

const LONG_SIDE = 800;
const JPEG_QUALITY = 0.8;

function stripDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(stripDataUrl(String(reader.result)));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

/** 缩放到长边 800，输出 JPEG base64。入参是完整 data URL，MIME 由调用方决定 */
async function downscale(
  dataUrl: string,
  longSide = LONG_SIDE,
  quality = JPEG_QUALITY,
): Promise<{ base64: string; width: number; height: number }> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const scale = Math.min(1, longSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 不可用');
  ctx.drawImage(image, 0, 0, width, height);

  return { base64: stripDataUrl(canvas.toDataURL('image/jpeg', quality)), width, height };
}

/** 浏览器里用原生 input[type=file] 选图，方便在 npm run dev 里调 UI */
function pickFileDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // 挂到 DOM 上（隐藏），方便调试工具/自动化往里塞文件
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => input.remove();

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        reject(new Error('没有选图'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve(String(reader.result));
      };
      reader.onerror = () => {
        cleanup();
        reject(reader.error ?? new Error('读取图片失败'));
      };
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

/** 拍照或从相册选，返回已存好的相对路径 */
export async function capturePhoto(source: 'camera' | 'prompt' = 'prompt'): Promise<PhotoDraft> {
  let dataUrl: string;

  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Prompt,
      // 先让原生缩到 1600，进 canvas 再缩到 800，老机型也不至于爆内存
      width: 1600,
      correctOrientation: true,
      saveToGallery: false,
      promptLabelHeader: '记录这一餐',
      promptLabelPhoto: '从相册选',
      promptLabelPicture: '拍一张',
      promptLabelCancel: '算了',
    });
    if (!photo.base64String) throw new Error('没有拿到照片数据');
    dataUrl = `data:image/jpeg;base64,${photo.base64String}`;
  } else {
    dataUrl = await pickFileDataUrl();
  }

  const resized = await downscale(dataUrl);
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const relPath = `photos/${now.getFullYear()}/${month}/${crypto.randomUUID()}.jpg`;

  await Filesystem.writeFile({
    path: relPath,
    data: resized.base64,
    directory: Directory.Data,
    recursive: true,
  });

  return {
    relPath,
    width: resized.width,
    height: resized.height,
    bytes: Math.round(resized.base64.length * 0.75),
  };
}

/** 读回图片做预览（data URL，原生/浏览器都通） */
export async function photoDataUrl(relPath: string): Promise<string> {
  const file = await Filesystem.readFile({ path: relPath, directory: Directory.Data });
  const data = typeof file.data === 'string' ? file.data : await blobToBase64(file.data);
  return `data:image/jpeg;base64,${data}`;
}

export async function deletePhotoFile(relPath: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: relPath, directory: Directory.Data });
  } catch {
    // 文件本来就不在，忽略
  }
}
