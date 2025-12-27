'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

export default function PaginationControls({
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    onPageChange,
    loading = false
}: PaginationControlsProps) {

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 7; // Maximum number of page buttons to show

        if (totalPages <= maxVisible) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between px-6 py-4">
            {/* Previous buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={!hasPrev || loading}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                >
                    <ChevronsLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrev || loading}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Page numbers */}
            <div className="flex gap-2">
                {getPageNumbers().map((page, index) => {
                    if (page === '...') {
                        return (
                            <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-500">
                                ...
                            </span>
                        );
                    }

                    const pageNum = page as number;
                    const isActive = pageNum === currentPage;

                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            disabled={loading}
                            className={`
                min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all
                ${isActive
                                    ? 'bg-violet-600 text-white shadow-lg scale-110'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-violet-50 hover:border-violet-300'
                                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            {pageNum}
                        </button>
                    );
                })}
            </div>

            {/* Next buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNext || loading}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={!hasNext || loading}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                >
                    <ChevronsRight className="w-5 h-5 text-gray-600" />
                </button>
            </div>
        </div>
    );
}