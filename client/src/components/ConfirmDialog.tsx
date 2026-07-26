import { usePreferences } from '../contexts/PreferencesContext';

import Button from './ui/Button';
import Modal from './Modal';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    body: string;
    confirmLabel?: string;
    destructive?: boolean;
    /** Disables both actions while the request is in flight (Q86). */
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Q85: replaces the native `confirm()` in `useSession.endSession`, whose buttons could
 * not be translated and which is suppressed outright in some embedded webviews — in an
 * app that already had a perfectly good `Modal`.
 *
 * Q11: archiving used to be a single unconfirmed click with no way back, while *ending* a
 * session — the reversible one — did prompt. Both now confirm, and archiving is undoable.
 */
export default function ConfirmDialog({
    open,
    title,
    body,
    confirmLabel,
    destructive = false,
    busy = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = usePreferences();

    return (
        <Modal open={open} onClose={onCancel} title={title} maxWidth="sm">
            <div className="space-y-4">
                <p className="text-sm text-dim">{body}</p>
                <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={onCancel} disabled={busy}>
                        {t('cancel')}
                    </Button>
                    <Button
                        variant={destructive ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        loading={busy}
                    >
                        {confirmLabel ?? t('confirm')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
