import type { AppUpdateInfo } from '@codeshelf/shared';
import { Sparkles, X } from 'lucide-react';

interface UpdateBannerProps {
  updateInfo: AppUpdateInfo;
  appVersion: string;
  onOpenUpdateModal: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({
  updateInfo,
  appVersion,
  onOpenUpdateModal,
  onDismiss,
}: UpdateBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-900 via-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between text-xs font-medium border-b border-white/15 shadow-md z-50">
      <div className="flex items-center gap-2">
        <Sparkles size={16} />
        <span>
          <strong>CodeShelf v{updateInfo.latestVersion}</strong> is now available! (Current: v{appVersion})
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenUpdateModal}
          className="bg-white text-blue-700 rounded px-2.5 py-1 text-xs font-semibold cursor-pointer hover:bg-blue-50 transition-colors"
        >
          View What's New & Download
        </button>
        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white p-0.5 cursor-pointer flex items-center transition-colors"
          title="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
