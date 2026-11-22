import { stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

const distributionRoot = resolve(import.meta.dir, "dist");

Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/runtime-config.js") {
      const apiUrl = JSON.stringify(process.env.API_PUBLIC_URL ?? process.env.VITE_API_URL ?? "");
      return new Response(`window.__FLOW_CONFIG__ = { apiUrl: ${apiUrl} };`, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    let requestedPath: string;
    try {
      requestedPath = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }

    const filePath = resolve(
      distributionRoot,
      `.${requestedPath === "/" ? "/index.html" : requestedPath}`,
    );
    if (filePath !== distributionRoot && !filePath.startsWith(`${distributionRoot}${sep}`)) {
      return new Response("Not found", { status: 404 });
    }

    try {
      if ((await stat(filePath)).isFile()) {
        const immutableAsset = requestedPath.startsWith("/assets/");
        return new Response(Bun.file(filePath), {
          headers: immutableAsset ? { "Cache-Control": "public, max-age=31536000, immutable" } : {},
        });
      }
    } catch {
      // SPA routes fall back to the application entry point.
    }

    return new Response(Bun.file(resolve(distributionRoot, "index.html")), {
      headers: { "Cache-Control": "no-cache" },
    });
  },
});
