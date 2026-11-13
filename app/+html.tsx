import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background-color: #070A10;
                overflow-x: hidden;
              }
              input, textarea, select,
              input:hover, textarea:hover, select:hover,
              input:focus, textarea:focus, select:focus,
              input:focus-visible, textarea:focus-visible, select:focus-visible,
              input:active, textarea:active, select:active {
                outline: none !important;
                outline-width: 0 !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
