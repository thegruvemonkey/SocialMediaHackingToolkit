// Vite's `?url` import suffix returns the asset URL as a string.
declare module '*?url' {
  const src: string;
  export default src;
}

// Allow importing the packaged stylesheet from apps.
declare module '*.css';
