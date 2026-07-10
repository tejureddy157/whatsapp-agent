import { appConfig } from "../../shared/config.js";
import { MediaDownloadError } from "../../shared/errors.js";

const GRAPH_API_VERSION = "v21.0";

export interface DownloadedMedia {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Two-step Graph API media fetch: the media ID resolves to a short-lived
 * signed URL, which is then downloaded separately — both requests need the
 * business's access token.
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<DownloadedMedia> {
  if (!appConfig.WHATSAPP_ACCESS_TOKEN) {
    throw new MediaDownloadError("WHATSAPP_ACCESS_TOKEN is not configured — cannot download media");
  }

  const authHeader = { Authorization: `Bearer ${appConfig.WHATSAPP_ACCESS_TOKEN}` };

  const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: authHeader,
  });
  if (!metaRes.ok) {
    throw new MediaDownloadError(`Failed to fetch media metadata: HTTP ${metaRes.status}`);
  }
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url || !meta.mime_type) {
    throw new MediaDownloadError("Media metadata response missing url or mime_type");
  }

  const fileRes = await fetch(meta.url, { headers: authHeader });
  if (!fileRes.ok) {
    throw new MediaDownloadError(`Failed to download media file: HTTP ${fileRes.status}`);
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType: meta.mime_type };
}
