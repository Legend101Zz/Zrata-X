'use client';

import { Users, Star, Download, } from 'lucide-react';

interface BulkActionsBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onShortlist: () => void;
    onExport: () => void;
}

export default function BulkActionsBar({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onShortlist,
    onExport
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="bg-violet-50 border-b border-violet-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-600" />
                    <span className="text-sm font-medium text-violet-900">
                        {selectedCount} selected
                    </span>
                </div>

                <button
                    onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
                    className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                >
                    {selectedCount === totalCount ? 'Deselect all' : `Select all ${totalCount}`}
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onShortlist}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
                >
                    <Star className="w-4 h-4" />
                    Add to Shortlist
                </button>

                <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>
        </div>
    );
}