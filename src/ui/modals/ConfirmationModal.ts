import { App, Modal, ButtonComponent, Notice } from 'obsidian';

export class ConfirmationModal extends Modal {
    private isProcessing = false;

    constructor(
        app: App,
        private title: string,
        private message: string,
        private onConfirm: () => void | Promise<void>,
        private onCancel?: () => void | Promise<void>,
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

        const cancelButton = new ButtonComponent(buttonContainer)
            .setButtonText(this.cancelText)
            .onClick(async () => {
                if (this.isProcessing) return;
                this.isProcessing = true;
                cancelButton.setDisabled(true);
                confirmButton.setDisabled(true);

                this.close();
                if (this.onCancel) {
                    try {
                        await this.onCancel();
                    } catch (error) {
                        console.error('ConfirmationModal: onCancel callback error:', error);
                        new Notice('Action failed. Please check console for details.');
                    }
                }
            });

        const confirmButton = new ButtonComponent(buttonContainer)
            .setButtonText(this.confirmText)
            .setCta()
            .onClick(async () => {
                if (this.isProcessing) return;
                this.isProcessing = true;
                cancelButton.setDisabled(true);
                confirmButton.setDisabled(true);

                this.close();
                try {
                    await this.onConfirm();
                } catch (error) {
                    console.error('ConfirmationModal: onConfirm callback error:', error);
                    new Notice('Action failed. Please check console for details.');
                }
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.isProcessing = false;
    }
}
