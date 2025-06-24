import type { SVGProps } from 'react';

export const Icons = {
  AppLogo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      height="28"
      viewBox="0 0 145 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Rumo Logo</title>
      <g style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.01em' }}>
        <text x="0" y="22">rum</text>
      </g>
      <g transform="translate(97, 14)">
        <path transform="rotate(-15)" d="M0 -12 A 12 12 0 0 1 10.39 -6 L 7.79 -4.5 A 8.5 8.5 0 0 0 0 -8.5Z" />
        <path transform="rotate(105)" d="M0 -12 A 12 12 0 0 1 10.39 -6 L 7.79 -4.5 A 8.5 8.5 0 0 0 0 -8.5Z" />
        <path transform="rotate(225)" d="M0 -12 A 12 12 0 0 1 10.39 -6 L 7.79 -4.5 A 8.5 8.5 0 0 0 0 -8.5Z" />
      </g>
    </svg>
  ),
};

export default Icons;
