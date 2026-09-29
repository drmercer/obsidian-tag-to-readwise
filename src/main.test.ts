import type { App, PluginManifest } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewToReadwisePlugin from "./main";

// Mock Obsidian classes for unit testing
vi.mock("obsidian", () => {
  class Plugin {
    app: App;
    manifest: PluginManifest;
    constructor(app: App, manifest: PluginManifest) {
      this.app = app;
      this.manifest = manifest;
    }
    addRibbonIcon() {}
    addCommand() {}
    addSettingTab() {}
    loadData() {
      return Promise.resolve({});
    }
    saveData() {
      return Promise.resolve();
    }
  }

  class PluginSettingTab {
    app: App;
    plugin: unknown;
    constructor(app: App, plugin: unknown) {
      this.app = app;
      this.plugin = plugin;
    }
  }

  class Modal {
    app: App;
    constructor(app: App) {
      this.app = app;
    }
  }

  class Notice {
    hide() {}
    setMessage() {}
  }

  return {
    Plugin,
    PluginSettingTab,
    Modal,
    Notice,
    requestUrl: vi.fn(),
  };
});

describe("ReviewToReadwisePlugin auto-sync and configuration", () => {
  const mockApp = {
    workspace: {
      onLayoutReady: vi.fn(),
    },
    vault: {
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      getName: vi.fn().mockReturnValue("TestVault"),
    },
  } as unknown as App;

  const mockManifest = {} as PluginManifest;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", {
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
    });
  });

  it("isConfigured returns false when settings are incomplete", () => {
    const plugin = new ReviewToReadwisePlugin(mockApp, mockManifest);
    plugin.settings = {
      readwiseToken: "",
      tagName: "review",
      category: "articles",
      bookTitle: "",
      bookAuthor: "",
      lastSyncedTime: 0,
      autoSyncOnLoad: true,
    };

    expect(plugin.isConfigured()).toBe(false);

    plugin.settings.readwiseToken = "valid-token";
    expect(plugin.isConfigured()).toBe(false);

    plugin.settings.bookTitle = "Book";
    expect(plugin.isConfigured()).toBe(false);

    plugin.settings.bookAuthor = "Author";
    expect(plugin.isConfigured()).toBe(true);
  });

  it("waitForObsidianSync returns immediately if sync plugin is disabled or missing", async () => {
    const plugin = new ReviewToReadwisePlugin(mockApp, mockManifest);
    await expect(plugin.waitForObsidianSync(100)).resolves.toBeUndefined();
  });

  it("waitForObsidianSync waits until syncing completes when sync plugin is active", async () => {
    let syncing = true;
    const listeners: Record<string, () => void> = {};

    const mockSyncInstance = {
      isSyncing: vi.fn(() => syncing),
      on: vi.fn((event: string, fn: () => void) => {
        listeners[event] = fn;
      }),
      off: vi.fn(),
    };

    const appWithSync = {
      ...mockApp,
      internalPlugins: {
        getPluginById: (id: string) => {
          if (id === "sync") {
            return { enabled: true, instance: mockSyncInstance };
          }
          return undefined;
        },
      },
    } as unknown as App;

    const plugin = new ReviewToReadwisePlugin(appWithSync, mockManifest);

    // Stop syncing after 50ms
    window.setTimeout(() => {
      syncing = false;
      if (listeners["status-change"]) {
        listeners["status-change"]();
      }
    }, 50);

    const startTime = Date.now();
    await plugin.waitForObsidianSync(1000);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(500);
  });
});
