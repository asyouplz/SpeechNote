import { fn } from 'jest-mock';

class MockComponent {
    private readonly events: Array<{ off?: () => void }> = [];
    private readonly children: MockComponent[] = [];

    onload(): void {}

    onunload(): void {}

    load(): void {
        this.onload();
    }

    unload(): void {
        for (const eventRef of this.events) {
            if (typeof eventRef.off === 'function') {
                eventRef.off();
            }
        }
        this.events.length = 0;

        while (this.children.length > 0) {
            const child = this.children.pop();
            child?.unload();
        }

        this.onunload();
    }

    registerEvent(eventRef: { off?: () => void }): { off?: () => void } {
        this.events.push(eventRef);
        return eventRef;
    }

    addChild(child: MockComponent): MockComponent {
        this.children.push(child);
        child.load();
        return child;
    }
}

const obsidianMock = {
    requestUrl: fn(),
    Plugin: fn(),
    Component: MockComponent,
    Modal: fn(),
    Setting: fn(),
    PluginSettingTab: fn(),
    TFile: fn(),
    TFolder: fn(),
    Vault: fn(),
    Workspace: fn(),
    App: fn(),
    Editor: fn(),
    MarkdownView: fn(),
    Notice: fn(),
    DropdownComponent: fn(),
    ToggleComponent: fn(),
    TextComponent: fn(),
    setIcon: fn(),
    getIcon: fn(),
};

export = obsidianMock;
