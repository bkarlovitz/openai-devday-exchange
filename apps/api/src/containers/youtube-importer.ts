import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env";

const PORT = 8791;

export class YoutubeImporter extends DurableObject<Env> {
  private startup?: Promise<void>;

  async fetch(request: Request): Promise<Response> {
    const container = this.ctx.container;
    const token = this.env.YOUTUBE_IMPORT_TOKEN;
    if (!container || !token) return new Response("Importer unavailable", { status: 503 });
    this.startup ??= this.start(container, token).finally(() => {
      this.startup = undefined;
    });
    await this.startup;
    return container.getTcpPort(PORT).fetch(request);
  }

  private async start(container: Container, token: string) {
    if (!container.running) {
      const image = container.images?.base;
      container.start({
        ...(image ? { image } : {}),
        enableInternet: true,
        env: { YOUTUBE_IMPORT_TOKEN: token },
      });
    }
    await container.setInactivityTimeout(120_000);
    const port = container.getTcpPort(PORT);
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      try {
        const response = await port.fetch("http://container/health", {
          signal: AbortSignal.timeout(1000),
        });
        await response.body?.cancel();
        if (response.ok) return;
      } catch {
        // The importer has not opened its HTTP port yet.
      }
      await scheduler.wait(250);
    }
    throw new Error("Subtitle container did not become ready.");
  }
}
