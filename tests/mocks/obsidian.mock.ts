import { fn } from 'jest-mock';

const obsidianMock = {
    requestUrl: fn(),
    Plugin: fn(),
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
};

export = obsidianMock;
