import { App, Modal, Setting, ButtonComponent } from 'obsidian';

export class ConfirmationModal extends Modal {
    constructor(
        app: App,
        private title: string,
        private message: string,
        private onConfirm: () => void,
        private onCancel?: () => void,
        private confirmText = 'Confirm',
        private cancelText = 'Cancel'
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        new ButtonComponent(buttonContainer)
            .setButtonText(this.cancelText)
            .onClick(() => {
                this.close();
                if (this.onCancel) {
                    try {
                        this.onCancel();
                    } catch (error) {
                        console.error('ConfirmationModal: onCancel callback error:', error);
                    }
                }
            });

        new ButtonComponent(buttonContainer)
            .setButtonText(this.confirmText)
            .setCta()
            .onClick(() => {
                this.close();
                try {
                    this.onConfirm();
                } catch (error) {
                    console.error('ConfirmationModal: onConfirm callback error:', error);
                }
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
