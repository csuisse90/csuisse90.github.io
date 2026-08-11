// What the machine will actually tell a web page about itself.
//
// Everything here is a real reading from a browser API — no invented numbers.
// A browser is sandboxed, so some of it is exact (core count, GPU string,
// storage quota), some is deliberately coarsened to frustrate fingerprinting
// (device memory is rounded to a power of two), and the one thing it will never
// report is system-wide CPU load. Where a value is inferred rather than read,
// `kind` says so, and the monitor prints that distinction rather than hiding it.

export type Reading = {
  label: string;
  value: string;
  /** measured: this process, now. reported: the browser told us. estimated:
   *  derived or deliberately coarse. */
  kind: "measured" | "reported" | "estimated" | "unavailable";
  note?: string;
};

type NavigatorWithExtras = Navigator & {
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; type?: string };
  getBattery?: () => Promise<{ level: number; charging: boolean; dischargingTime: number }>;
  userAgentData?: {
    platform?: string;
    brands?: { brand: string; version: string }[];
    getHighEntropyValues?: (hints: string[]) => Promise<Record<string, string>>;
  };
};

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
};

export function bytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let at = 0;
  let value = n;
  while (value >= 1024 && at < units.length - 1) {
    value /= 1024;
    at++;
  }
  return `${value >= 100 || at === 0 ? Math.round(value) : value.toFixed(1)} ${units[at]}`;
}

/** The GPU string the driver reports. This is the single most specific piece of
 *  hardware identification a page can get, which is why it sits behind an
 *  extension some browsers now restrict. */
export function graphics(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { renderer: "no WebGL context in this browser", vendor: "" };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const vendor = info
      ? String(gl.getParameter(info.UNMASKED_VENDOR_WEBGL))
      : String(gl.getParameter(gl.VENDOR));
    // Some builds answer with an empty string rather than refusing outright.
    return { renderer: renderer.trim() || "withheld by this browser", vendor: vendor.trim() };
  } catch {
    return { renderer: "unavailable", vendor: "" };
  }
}

/** A single-thread throughput figure, measured here rather than looked up: how
 *  many million simple integer operations this machine manages per second. It
 *  is the only honest way to say anything about processor speed, because the
 *  clock rate is not exposed to a page. */
export function benchmark(): number {
  const start = performance.now();
  let total = 0;
  let iterations = 0;
  // Run for a fixed slice of time rather than a fixed count, so a slow machine
  // is not stalled by the measurement.
  while (performance.now() - start < 30) {
    for (let i = 0; i < 100_000; i++) total = (total + i * 3) | 0;
    iterations += 100_000;
  }
  const elapsed = performance.now() - start;
  void total;
  return iterations / elapsed / 1000; // million operations per second
}

export async function collect(): Promise<Reading[]> {
  const nav = navigator as NavigatorWithExtras;
  const out: Reading[] = [];

  const high = await nav.userAgentData?.getHighEntropyValues?.([
    "architecture",
    "bitness",
    "model",
    "platformVersion",
    "fullVersionList",
  ]).catch(() => undefined);

  const platform = nav.userAgentData?.platform ?? guessPlatform(navigator.userAgent);
  const architecture = high?.architecture
    ? `${high.architecture}${high.bitness ? ` ${high.bitness}-bit` : ""}`
    : guessArchitecture(navigator.userAgent);

  out.push({ label: "host", value: `${platform}${high?.platformVersion ? ` ${high.platformVersion}` : ""}`, kind: "reported" });
  out.push({ label: "arch", value: architecture, kind: high?.architecture ? "reported" : "estimated", note: high?.architecture ? undefined : "read out of the user agent string" });

  const brand = nav.userAgentData?.brands?.filter((b) => !/Not.?A.?Brand/i.test(b.brand)).at(-1);
  out.push({
    label: "engine",
    value: brand ? `${brand.brand} ${brand.version}` : shortUserAgent(navigator.userAgent),
    kind: "reported",
  });

  out.push({
    label: "cores",
    value: `${navigator.hardwareConcurrency ?? "?"} logical`,
    kind: "reported",
    note: "hardwareConcurrency — the count is exact, the clock rate is not exposed",
  });

  const speed = benchmark();
  out.push({
    label: "throughput",
    value: `${speed.toFixed(0)} Mops/s`,
    kind: "measured",
    note: "one thread, integer arithmetic, measured just now",
  });

  const gpu = graphics();
  out.push({ label: "gpu", value: gpu.renderer, kind: "reported", note: gpu.vendor || undefined });
  out.push({
    label: "webgpu",
    value: "gpu" in navigator ? "available" : "not available",
    kind: "reported",
  });

  if (nav.deviceMemory) {
    out.push({
      label: "memory",
      value: `${nav.deviceMemory} GB`,
      kind: "estimated",
      note: "rounded to a power of two on purpose, to resist fingerprinting",
    });
  } else {
    out.push({ label: "memory", value: "not reported", kind: "unavailable", note: "deviceMemory is Chromium-only" });
  }

  const heap = (performance as PerformanceWithMemory).memory;
  if (heap) {
    out.push({
      label: "heap",
      value: `${bytes(heap.usedJSHeapSize)} of ${bytes(heap.jsHeapSizeLimit)}`,
      kind: "measured",
      note: "this tab's JavaScript heap, not the machine's RAM",
    });
  }

  const quota = await navigator.storage?.estimate?.().catch(() => undefined);
  if (quota?.quota) {
    out.push({
      label: "storage",
      value: `${bytes(quota.usage ?? 0)} used of ${bytes(quota.quota)} granted`,
      kind: "reported",
      note: "what this origin may keep, not the size of the disc",
    });
  }

  out.push({
    label: "screen",
    value: `${screen.width}×${screen.height} at ${window.devicePixelRatio}× · ${screen.colorDepth}-bit`,
    kind: "reported",
  });

  const connection = nav.connection;
  if (connection?.effectiveType) {
    out.push({
      label: "network",
      value: `${connection.effectiveType}${connection.downlink ? ` · ${connection.downlink} Mb/s` : ""}${connection.rtt ? ` · ${connection.rtt} ms` : ""}`,
      kind: "estimated",
      note: "the browser's own rolling estimate, not a speed test",
    });
  }

  try {
    const battery = await nav.getBattery?.();
    if (battery) {
      out.push({
        label: "battery",
        value: `${Math.round(battery.level * 100)}% ${battery.charging ? "charging" : "on battery"}`,
        kind: "reported",
      });
    }
  } catch {
    // Firefox removed getBattery; nothing to report and nothing to say.
  }

  out.push({
    label: "locale",
    value: `${navigator.language} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    kind: "reported",
  });

  out.push({
    label: "offline",
    value: navigator.onLine ? "online" : "offline — served from cache",
    kind: "reported",
  });

  return out;
}

function guessPlatform(ua: string): string {
  if (/Mac/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/(iPhone|iPad)/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "unknown";
}

function guessArchitecture(ua: string): string {
  if (/arm64|aarch64/i.test(ua)) return "arm64";
  if (/x86_64|Win64|x64/i.test(ua)) return "x86 64-bit";
  return "unknown";
}

function shortUserAgent(ua: string): string {
  return /(Firefox|Safari|Chrome)\/[\d.]+/.exec(ua)?.[0] ?? ua.slice(0, 40);
}
