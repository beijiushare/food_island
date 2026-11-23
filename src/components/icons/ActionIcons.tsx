import type { SVGProps } from 'react';

/**
 * 动作类小图标。
 * 规范（设计文档 §7.4）：20×20、描边 2.2px、圆头圆角、currentColor。
 */

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...rest }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
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

/** 相机 */
export function CameraIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.4 8.6h3.1l1.6-2.4h7.8l1.6 2.4h3.1a1.4 1.4 0 0 1 1.4 1.4v7.2a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 17.2V10a1.4 1.4 0 0 1 1.4-1.4Z" />
      <circle cx="12" cy="13.4" r="3.3" />
    </Base>
  );
}

/** 铅笔 */
export function PencilIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20h4l10.2-10.2a2.1 2.1 0 0 0 0-3l-1-1a2.1 2.1 0 0 0-3 0L4 16v4Z" />
      <path d="M13.6 6.4 17.6 10.4" />
    </Base>
  );
}
