import { TAbstractFile, TFile, TFolder } from 'obsidian';

export function isTFile(file: TAbstractFile | null | undefined): file is TFile {
    return file instanceof TFile;
}

export function isTFolder(file: TAbstractFile | null | undefined): file is TFolder {
    return file instanceof TFolder;
}

export function assertTFile(
    file: TAbstractFile | null | undefined,
    context?: string
): asserts file is TFile {
    if (!isTFile(file)) {
        const prefix = context ? `[${context}] ` : '';
        throw new Error(`${prefix}Expected a TFile instance.`);
    }
}

export function assertTFolder(
    file: TAbstractFile | null | undefined,
    context?: string
): asserts file is TFolder {
    if (!isTFolder(file)) {
        const prefix = context ? `[${context}] ` : '';
        throw new Error(`${prefix}Expected a TFolder instance.`);
    }
}
