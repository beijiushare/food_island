import type { SVGProps } from 'react';

/**
 * 底部导航图标。
 * 规范（设计文档 §7.4）：24×24、描边 2.2px、圆头圆角、currentColor。
 */

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...rest }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 今天：一碗饭 */
export function BowlIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.2 11.4h17.6a8.8 8.8 0 0 1-17.6 0Z" />
      <path d="M7.6 8.2c0-1.6 1.1-2.4 1.1-4M12 8.2c0-1.6 1.1-2.4 1.1-4M16.4 8.2c0-1.6 1.1-2.4 1.1-4" />
      <path d="M6.6 18.8h10.8" />
    </IconBase>
  );
}

/** 统计：三根柱子 */
export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 19.6V14M10 19.6V8.4M16 19.6v-8M22 19.6V5" />
    </IconBase>
  );
}

/** 我的：小动物头像（圆头 + 两只耳朵） */
export function PersonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z" />
      <path d="M6.6 6.3 5.4 3.4M17.4 6.3l1.2-2.9" />
      <path d="M9.6 12.6h.01M14.4 12.6h.01" strokeWidth="2.8" />
      <path d="M10.4 15.8c.9.6 2.3.6 3.2 0" />
    </IconBase>
  );
}
