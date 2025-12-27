/**
 * FD Opportunity Card - Displays a single FD rate opportunity
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, CreditCard } from 'lucide-react';

interface FDRate {
    id: number;
    bank_name: string;
    bank_type: string;
    tenure_display: string;
    interest_rate_general: number;
    interest_rate_senior: number | null;
    has_credit_card_offer: boolean;
    special_features: Record<string, any> | null;
}

interface Props {
    fd: FDRate;
}

const bankTypeLabels: Record<string, string> = {
    small_finance: 'Small Finance Bank',
    private: 'Private Bank',
    public: 'Public Bank',
    nbfc: 'NBFC',
};

const bankTypeColors: Record<string, string> = {
    small_finance: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    private: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    public: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    nbfc: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

export function FDOpportunityCard({ fd }: Props) {
    const isHighYield = fd.interest_rate_general >= 8.0;

    return (
        <div className={`p-3 rounded-lg border transition-all hover:shadow-md ${isHighYield
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {/* Bank name and type */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {fd.bank_name}
                        </h4>
                        <Badge
                            variant="outline"
                            className={`text-xs ${bankTypeColors[fd.bank_type] || ''}`}
                        >
                            {bankTypeLabels[fd.bank_type] || fd.bank_type}
                        </Badge>
                    </div>

                    {/* Tenure */}
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {fd.tenure_display}
                    </p>

                    {/* Features */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {isHighYield && (
                            <Badge className="bg-green-500 text-white text-xs">
                                <Star className="h-3 w-3 mr-1 fill-white" />
                                High Yield
                            </Badge>
                        )}
                        {fd.has_credit_card_offer && (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:text-blue-300">
                                <CreditCard className="h-3 w-3 mr-1" />
                                CC Available
                            </Badge>
                        )}
                        {fd.interest_rate_senior && fd.interest_rate_senior > fd.interest_rate_general && (
                            <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 dark:text-purple-300">
                                Senior: {fd.interest_rate_senior}%
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Rate */}
                <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-bold ${isHighYield ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                        {fd.interest_rate_general}%
                    </div>
                    <span className="text-xs text-slate-500">p.a.</span>
                </div>
            </div>

            {/* Special features */}
            {fd.special_features && Object.keys(fd.special_features).length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500">
                        {typeof fd.special_features === 'object'
                            ? Object.values(fd.special_features).slice(0, 2).join(' • ')
                            : String(fd.special_features)
                        }
                    </p>
                </div>
            )}
        </div>
    );
}