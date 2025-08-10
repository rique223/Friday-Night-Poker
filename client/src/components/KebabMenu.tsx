import { usePreferences } from '../contexts/PreferencesContext';

import Button from './ui/Button';
import OverflowMenu from './OverflowMenu';

interface KebabMenuProps {
    onArchive?: () => void;
}

export default function KebabMenu({ onArchive }: KebabMenuProps) {
    const { t } = usePreferences();

    const handleArchive = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onArchive?.();
    };

    return (
        <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <OverflowMenu
                ariaLabel={t('sessionActions')}
                buttonClassName="btn btn-secondary px-2 py-1 text-sm"
                panelClassName="absolute right-0 mt-2 w-48 card shadow-lg z-20"
            >
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleArchive}
                    className="w-full text-left"
                >
                    {t('deleteArchive')}
                </Button>
            </OverflowMenu>
        </div>
    );
}
