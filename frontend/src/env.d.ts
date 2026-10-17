import "react";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_HUB_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// CSS custom properties used in inline styles.
declare module "react" {
  interface CSSProperties {
    "--user-color"?: string;
  }
}
