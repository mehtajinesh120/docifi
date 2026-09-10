// Helper to fetch with retry
async function fetchWithRetry(url: string, options: any = {}, retries = 3, delayMs = 500): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(1.5, attempt)));
        continue;
      }
      return res;
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(1.5, attempt)));
      }
    }
  }
  throw lastErr || new Error(`Failed to fetch ${url}`);
}

export async function extractImgbbImages(urls: string[]) {
  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Referer: "https://ibb.co/",
  };

  const processSingleUrl = async (rawUrl: string, idx: number) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) throw new Error("Empty URL");

    let directImageUrl = "";

    // 1. Direct image link (i.ibb.co, i.ibb.co.com, or direct extension)
    if (
      trimmed.includes("i.ibb.co") ||
      /\.(png|jpe?g|webp|gif|bmp)(\?.*)?$/i.test(trimmed)
    ) {
      directImageUrl = trimmed;
    } else if (trimmed.includes("ibb.co")) {
      // 2. ImgBB HTML viewer page
      const pageRes = await fetchWithRetry(trimmed, { headers: browserHeaders }, 3, 600);
      if (!pageRes.ok) {
        throw new Error(`Failed to load ImgBB page (HTTP ${pageRes.status})`);
      }
      const html = await pageRes.text();

      // Patterns to find direct image link
      const og1 = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const og2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
      const tw = html.match(/<meta[^>]+(?:property|name)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
      const linkSrc = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
      const ibbSrc = html.match(/(?:src|data-src)=["'](https?:\/\/i\d*\.ibb\.co(?:\.com)?\/[^"']+)["']/i);
      const viewerDiv = html.match(/<div[^>]+id=["']image-viewer-container["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
      const anyImg = html.match(/src=["'](https?:\/\/[^"']+\.(?:png|jpe?g|webp|gif|bmp)[^"']*)["']/i);

      const foundUrl =
        og1?.[1] ||
        og2?.[1] ||
        ibbSrc?.[1] ||
        viewerDiv?.[1] ||
        linkSrc?.[1] ||
        tw?.[1] ||
        anyImg?.[1];

      if (foundUrl) {
        directImageUrl = foundUrl.replace(/&amp;/g, "&");
      } else {
        throw new Error("Could not locate direct image source in ImgBB viewer page.");
      }
    } else {
      directImageUrl = trimmed;
    }

    // Download the direct image binary
    const imgRes = await fetchWithRetry(
      directImageUrl,
      {
        headers: {
          ...browserHeaders,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      },
      3,
      600
    );

    if (!imgRes.ok) {
      throw new Error(`Image download failed (HTTP ${imgRes.status})`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const base64 = `data:${contentType};base64,${buffer.toString("base64")}`;

    let derivedName = `imgbb_shot_${idx + 1}.jpg`;
    try {
      const parsedPath = new URL(directImageUrl).pathname;
      const baseName = parsedPath.split("/").pop();
      if (baseName && baseName.includes(".")) {
        derivedName = baseName;
      }
    } catch {
      // keep fallback name
    }

    return {
      id: `imgbb_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      name: derivedName,
      source: "imgbb" as const,
      base64,
      size: buffer.length,
      mimeType: contentType,
      originalUrl: trimmed,
    };
  };

  // Concurrency throttling (3 concurrent requests)
  const results: any[] = [];
  const errors: string[] = [];
  const concurrency = 3;

  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency);
    const chunkPromises = chunk.map((url, chunkIdx) =>
      processSingleUrl(url, i + chunkIdx)
        .then((res) => ({ success: true as const, data: res, url: "", error: "" }))
        .catch((err) => ({ success: false as const, data: null, url, error: err?.message || String(err) }))
    );

    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach((cr) => {
      if (cr.success && cr.data) {
        results.push(cr.data);
      } else {
        errors.push(`${cr.url}: ${cr.error}`);
      }
    });
  }

  return {
    images: results,
    totalRequested: urls.length,
    successful: results.length,
    errors,
  };
}
