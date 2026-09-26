import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  TFile,
  requestUrl,
} from "obsidian";
import {
  ensureTaggedBlocksHaveIds,
  extractHighlights,
  filterFilesByModifiedTime,
} from "./blockUtils";

/** ---------- Modals ---------- */

class MissingSettingsModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Missing required settings" });
    contentEl.createEl("p", {
      text: "Please enter a book title and author in the plugin settings before syncing.",
    });
    const btnContainer = contentEl.createDiv({ cls: "modal-button-container" });
    const okBtn = btnContainer.createEl("button", {
      text: "OK",
      cls: "mod-cta",
    });
    okBtn.addEventListener("click", () => {
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/** ---------- Types ---------- */

type ReadwiseCategory = "articles" | "books" | "tweets" | "podcasts";

interface ReviewToReadwiseSettings {
  readwiseToken: string;
  tagName: string; // without the leading '#'
  category: ReadwiseCategory;
  bookTitle: string; // fixed Readwise "book" title all highlights are grouped under
  bookAuthor: string; // fixed Readwise author for all highlights
  lastSyncedTime: number; // timestamp in ms of last successful sync
}

const DEFAULT_SETTINGS: ReviewToReadwiseSettings = {
  readwiseToken: "",
  tagName: "review",
  category: "articles",
  bookTitle: "",
  bookAuthor: "",
  lastSyncedTime: 0,
};

interface ExtractedBlock {
  file: TFile;
  cleanedText: string; // block text with the tag and block ID stripped
  blockId: string; // stable Obsidian block reference used as the Readwise highlight_url anchor
  dotTags: string[]; // extracted Readwise tags associated with the block
}

interface ReadwiseHighlight {
  text: string;
  title: string;
  author?: string;
  source_url?: string;
  highlight_url?: string;
  category: ReadwiseCategory;
  highlighted_at: string; // ISO 8601
  note?: string;
}

const READWISE_HIGHLIGHTS_URL = "https://readwise.io/api/v2/highlights/";
const READWISE_AUTH_URL = "https://readwise.io/api/v2/auth/";
const BATCH_SIZE = 50;

/** ---------- Plugin ---------- */

export default class ReviewToReadwisePlugin extends Plugin {
  settings!: ReviewToReadwiseSettings;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("book-up", "Sync #review blocks to Readwise", () => {
      void this.runSync();
    });

    this.addCommand({
      id: "sync-review-blocks-to-readwise",
      name: "Sync all #review blocks to Readwise",
      callback: () => {
        void this.runSync();
      },
    });

    this.addCommand({
      id: "resync-all-highlights-to-readwise",
      name: "Re-sync all highlights to Readwise",
      callback: () => {
        void this.runSync(undefined, { ignoreLastSyncedTime: true });
      },
    });

    this.addCommand({
      id: "sync-review-blocks-in-current-file",
      name: "Sync #review blocks in current file to Readwise",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) {
          void this.runSync(file);
        }
        return true;
      },
    });

    this.addSettingTab(new ReviewToReadwiseSettingTab(this.app, this));
  }

  async loadSettings() {
    const loaded =
      (await this.loadData()) as Partial<ReviewToReadwiseSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /** Entry point: scan (one file or whole vault), send to Readwise, optionally mark synced. */
  async runSync(
    onlyFile?: TFile,
    options?: { ignoreLastSyncedTime?: boolean },
  ) {
    if (!this.settings.readwiseToken) {
      new Notice("Set your Readwise API token in plugin settings first.");
      return;
    }

    if (!this.settings.bookTitle.trim() || !this.settings.bookAuthor.trim()) {
      new MissingSettingsModal(this.app).open();
      return;
    }

    const tagName = this.settings.tagName.trim().replace(/^#/, "");
    if (!tagName) {
      new Notice("Set a tag name (without '#') in plugin settings first.");
      return;
    }

    const syncStartTime = Date.now();

    let files: TFile[];
    if (onlyFile) {
      files = [onlyFile];
    } else if (options?.ignoreLastSyncedTime) {
      files = this.app.vault.getMarkdownFiles();
    } else {
      files = filterFilesByModifiedTime(
        this.app.vault.getMarkdownFiles(),
        this.settings.lastSyncedTime,
      );
    }

    const notice = new Notice(
      `Scanning ${files.length} file(s) for #${tagName}…`,
      0,
    );

    let blocks: ExtractedBlock[];
    try {
      blocks = await this.extractTaggedBlocks(files, tagName);
    } catch (err) {
      notice.hide();
      new Notice(`Error while scanning vault: ${(err as Error).message}`);
      console.error(err);
      return;
    }

    if (blocks.length === 0) {
      notice.hide();
      new Notice(`No blocks tagged #${tagName} found.`);
      if (!onlyFile) {
        this.settings.lastSyncedTime = syncStartTime;
        await this.saveSettings();
      }
      return;
    }

    notice.setMessage(`Sending ${blocks.length} block(s) to Readwise…`);

    let highlightsUrl: string | undefined;
    try {
      highlightsUrl = await this.sendBlocksToReadwise(blocks);
    } catch (err) {
      notice.hide();
      new Notice(`Readwise sync failed: ${(err as Error).message}`);
      console.error(err);
      return;
    }

    if (!onlyFile) {
      this.settings.lastSyncedTime = syncStartTime;
      await this.saveSettings();
    }

    notice.hide();

    const successFragment = createFragment((frag) => {
      frag.appendText(`Sent ${blocks.length} block(s) to Readwise.`);
      if (highlightsUrl) {
        frag.createEl("br");
        frag.createEl("a", {
          text: "View in Readwise",
          href: highlightsUrl,
        });
      }
    });

    new Notice(successFragment);
  }

  /** Validate the stored API token against Readwise's auth endpoint. */
  async validateToken(token: string): Promise<boolean> {
    try {
      const res = await requestUrl({
        url: READWISE_AUTH_URL,
        method: "GET",
        headers: { Authorization: `Token ${token}` },
        throw: false,
      });
      return res.status === 204;
    } catch (err) {
      console.error("Readwise token validation failed", err);
      return false;
    }
  }

  /**
   * Scans the given files and returns every "block" (paragraph, list item,
   * blockquote, etc. — anything separated by a blank line) that contains
   * the target tag as a whole word, e.g. #review but not #reviewed.
   *
   * Each matched block is also given a stable Obsidian block ID (^abc123)
   * if it doesn't already have one, appended in-place in the file. That ID
   * is what makes the Readwise highlight_url stable across edits, so
   * re-syncing an edited block updates the existing Readwise highlight
   * instead of creating a duplicate.
   */
  private async extractTaggedBlocks(
    files: TFile[],
    tagName: string,
  ): Promise<ExtractedBlock[]> {
    const results: ExtractedBlock[] = [];

    for (const file of files) {
      let fileHighlights: {
        cleanedText: string;
        blockId: string;
        dotTags: string[];
      }[] = [];

      await this.app.vault.process(file, (data) => {
        const { newMarkdown, containedTag } = ensureTaggedBlocksHaveIds(
          data,
          tagName,
          () => this.generateBlockId(data),
        );

        if (containedTag) {
          fileHighlights = extractHighlights(newMarkdown, tagName);
        }

        return newMarkdown;
      });

      for (const h of fileHighlights) {
        results.push({
          file,
          cleanedText: h.cleanedText,
          blockId: h.blockId,
          dotTags: h.dotTags,
        });
      }
    }

    return results;
  }

  /** Generates a short block ID, avoiding collision with any block ID already in the file.
   * Always exactly 7 chars so it can never fall under blockIdRegex's minimum length
   * (Math.random().toString(36) can occasionally yield fewer digits than requested). */
  private generateBlockId(existingContent: string): string {
    let id: string;
    do {
      id = Math.random().toString(36).slice(2).padEnd(7, "0").slice(0, 7);
    } while (existingContent.includes(`^${id}`));
    return id;
  }

  /** Builds the obsidian:// deep link straight to a specific block.
   * This same URL doubles as the Readwise highlight_url,
   * so it must stay identical across syncs as long as the block ID doesn't change. */
  private buildBlockUrl(file: TFile, blockId: string): string {
    const vaultName = this.app.vault.getName();
    const encodedTarget = encodeURIComponent(`${file.path}#^${blockId}`);
    const encodedVault = encodeURIComponent(vaultName);
    const obsidianUrl = `obsidian://open?vault=${encodedVault}&file=${encodedTarget}`;

    return obsidianUrl;
  }

  /** Builds the obsidian:// deep link to open the vault */
  private buildVaultUrl(): string {
    const vaultName = this.app.vault.getName();
    const encodedVault = encodeURIComponent(vaultName);
    const obsidianUrl = `obsidian://open?vault=${encodedVault}&__cachebuster=1`;

    return obsidianUrl;
  }

  /** Sends extracted blocks to Readwise in batches. Returns highlights_url if available. */
  private async sendBlocksToReadwise(
    blocks: ExtractedBlock[],
  ): Promise<string | undefined> {
    const vaultUrl = this.buildVaultUrl();
    const highlights: ReadwiseHighlight[] = blocks.map(
      ({ file, cleanedText, blockId, dotTags }) => {
        const url = this.buildBlockUrl(file, blockId);
        // append file name to text
        const text = `${cleanedText}\n\n(${file.basename})`;

        return {
          text,
          title: this.settings.bookTitle,
          author: this.settings.bookAuthor || undefined,
          source_url: vaultUrl,
          highlight_url: url,
          category: this.settings.category,
          highlighted_at: new Date(file.stat.ctime).toISOString(),
          note: dotTags.map((tag) => `.${tag}`).join(" ") || undefined,
        };
      },
    );

    let highlightsUrl: string | undefined;
    for (let i = 0; i < highlights.length; i += BATCH_SIZE) {
      const batch = highlights.slice(i, i + BATCH_SIZE);
      const url = await this.sendBatchWithRetry(batch);
      if (url && !highlightsUrl) {
        highlightsUrl = url;
      }
    }
    return highlightsUrl;
  }

  private async sendBatchWithRetry(
    batch: ReadwiseHighlight[],
    attempt = 1,
  ): Promise<string | undefined> {
    const res = await requestUrl({
      url: READWISE_HIGHLIGHTS_URL,
      method: "POST",
      headers: {
        Authorization: `Token ${this.settings.readwiseToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ highlights: batch }),
      throw: false,
    });

    if (res.status === 200 || res.status === 201) {
      const data = res.json as unknown;
      if (Array.isArray(data)) {
        for (const item of data) {
          if (
            item &&
            typeof item === "object" &&
            "highlights_url" in item &&
            typeof (item as Record<string, unknown>).highlights_url ===
              "string" &&
            (item as Record<string, unknown>).highlights_url
          ) {
            return (item as Record<string, unknown>).highlights_url as string;
          }
        }
      }
      return undefined;
    }

    // Readwise rate-limits at 429 and tells you how long to wait.
    if (res.status === 429 && attempt <= 3) {
      const retryAfter = Number(res.headers["retry-after"] ?? 5);
      await new Promise((resolve) =>
        window.setTimeout(resolve, retryAfter * 1000),
      );
      return this.sendBatchWithRetry(batch, attempt + 1);
    }

    throw new Error(`Readwise API returned ${res.status}: ${res.text}`);
  }
}

/** ---------- Settings Tab ---------- */

class ReviewToReadwiseSettingTab extends PluginSettingTab {
  plugin: ReviewToReadwisePlugin;

  constructor(app: App, plugin: ReviewToReadwisePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    if (typeof value === "string") {
      value = value.trim();
      if (key === "tagName") {
        value = (value as string).replace(/^#/, "");
      }
    }
    (this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
    await this.plugin.saveSettings();
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const lastSyncedText = this.plugin.settings.lastSyncedTime
      ? new Date(this.plugin.settings.lastSyncedTime).toLocaleString()
      : "Never";

    return [
      {
        name: "Readwise API token",
        desc: "Find this at https://readwise.io/access_token",
        render: (setting: Setting) => {
          setting
            .addText((text) => {
              text
                .setPlaceholder("Enter your token")
                .setValue(this.plugin.settings.readwiseToken)
                .onChange(async (value) => {
                  this.plugin.settings.readwiseToken = value.trim();
                  await this.plugin.saveSettings();
                });
              text.inputEl?.setAttribute("type", "password");
            })
            .addButton((btn) =>
              btn.setButtonText("Validate").onClick(async () => {
                btn.setDisabled(true).setButtonText("Checking…");
                const ok = await this.plugin.validateToken(
                  this.plugin.settings.readwiseToken,
                );
                new Notice(ok ? "Token is valid." : "Token is invalid.");
                btn.setDisabled(false).setButtonText("Validate");
              }),
            );
        },
      },
      {
        name: "Tag to scan for",
        desc: "Without the '#'. Blocks containing this tag will be sent to Readwise.",
        control: {
          type: "text",
          key: "tagName",
          placeholder: "review",
        },
      },
      {
        name: "Book title",
        desc: "All highlights are grouped under this single Readwise book/title.",
        control: {
          type: "text",
          key: "bookTitle",
          placeholder: "My Obsidian notes",
        },
      },
      {
        name: "Author",
        desc: "Author field for every highlight sent to Readwise.",
        control: {
          type: "text",
          key: "bookAuthor",
          placeholder: "Your name",
        },
      },
      {
        name: "Readwise category",
        desc: "Category assigned to highlights created from your notes.",
        control: {
          type: "dropdown",
          key: "category",
          options: {
            articles: "Articles",
            books: "Books",
            tweets: "Tweets",
            podcasts: "Podcasts",
          },
        },
      },
      {
        name: "Last synced time",
        desc: `Highlights were last synced: ${lastSyncedText}`,
        render: (setting: Setting) => {
          setting.addButton((btn) =>
            btn.setButtonText("Reset").onClick(async () => {
              this.plugin.settings.lastSyncedTime = 0;
              await this.plugin.saveSettings();
              this.update();
              new Notice("Last synced time reset.");
            }),
          );
        },
      },
    ];
  }
}
