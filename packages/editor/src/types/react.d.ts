import 'react';

declare module 'react' {
  // Allow `--ce-*` custom properties in `style` objects; the library never sets concrete properties inline.
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined;
  }
}
