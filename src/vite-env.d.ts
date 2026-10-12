/// <reference types="vite/client" />

/**
 * Asset imports are used with an explicit `?url` suffix so the build returns a
 * plain URL string. These declarations keep TypeScript happy for the formats
 * the UI pulls in.
 */
declare module "*.jpg?url" {
  const src: string;
  export default src;
}
declare module "*.png?url" {
  const src: string;
  export default src;
}
declare module "*.webp?url" {
  const src: string;
  export default src;
}
declare module "*.svg?url" {
  const src: string;
  export default src;
}
declare module "*.woff2?url" {
  const src: string;
  export default src;
}
