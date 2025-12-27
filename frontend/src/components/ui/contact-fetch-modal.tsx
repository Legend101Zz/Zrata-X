'use client';

import { Phone, Mail, Loader2, CheckCircle, XCircle, AlertCircle, Users, Database, Zap } from 'lucide-react';
import { HatchContactResult } from '@/utils/hatchApi';

interface ContactFetchModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidates: Array<{
        id: string;
        name: string;
        currentRole?: string;
    }>;
    results: HatchContactResult[];
    loading: boolean;
    onFetch: () => void;
}

export default function ContactFetchModal({
    isOpen,
    onClose,
    candidates,
    results,
    loading,
    onFetch,
}: ContactFetchModalProps) {
    if (!isOpen) return null;

    const getStatusIcon = (result: HatchContactResult) => {
        if (result.success && (result.phone || result.email)) {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        } else if (result.error) {
            return <XCircle className="w-5 h-5 text-red-500" />;
        } else {
            return <AlertCircle className="w-5 h-5 text-yellow-500" />;
        }
    };

    const hasResults = results.length > 0;
    const successCount = results.filter(r => r.success && (r.phone || r.email)).length;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Fetch Contact Information</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Retrieve phone numbers and email addresses for {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!hasResults && !loading && (
                        <>
                            {/* Info Section */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start space-x-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="font-medium text-blue-900 mb-1">How it works</h3>
                                        <ul className="text-sm text-blue-800 space-y-1">
                                            <li className="flex items-center">
                                                <Database className="w-4 h-4 mr-2" />
                                                First checks our cache for existing contact info
                                            </li>
                                            <li className="flex items-center">
                                                <Zap className="w-4 h-4 mr-2" />
                                                If not cached, fetches from Hatch API
                                            </li>
                                            <li className="flex items-center">
                                                <Phone className="w-4 h-4 mr-2" />
                                                Priority: Phone number, then email if phone unavailable
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Candidates List */}
                            <div className="space-y-3 mb-6">
                                <h3 className="font-semibold text-gray-900 flex items-center">
                                    <Users className="w-5 h-5 mr-2" />
                                    Selected Candidates
                                </h3>
                                {candidates.map((candidate, index) => (
                                    <div
                                        key={candidate.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">{candidate.name}</p>
                                            {candidate.currentRole && (
                                                <p className="text-sm text-gray-600">{candidate.currentRole}</p>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-500">#{index + 1}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Cost Estimate */}
                            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-violet-900">Estimated API Calls</p>
                                        <p className="text-xs text-violet-700 mt-0.5">
                                            Only charged if data is fetched from Hatch API (cache hits are free)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-violet-900">{candidates.length}</p>
                                        <p className="text-xs text-violet-700">request{candidates.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
                                    <p className="text-lg font-medium text-gray-900">Fetching contact information...</p>
                                    <p className="text-sm text-gray-600 mt-1">This may take a few moments</p>
                                </div>
                            </div>

                            {/* Progress indicators */}
                            <div className="space-y-2">
                                {candidates.map((candidate, index) => {
                                    const result = results[index];
                                    return (
                                        <div
                                            key={candidate.id}
                                            className={`flex items-center justify-between p-3 rounded-lg ${result
                                                ? result.success
                                                    ? 'bg-green-50 border border-green-200'
                                                    : 'bg-red-50 border border-red-200'
                                                : 'bg-gray-50 border border-gray-200'
                                                }`}
                                        >
                                            <span className="text-sm font-medium text-gray-900">{candidate.name}</span>
                                            {result ? (
                                                result.success ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                )
                                            ) : (
                                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {hasResults && !loading && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                        <div>
                                            <p className="font-semibold text-green-900">Fetch Complete</p>
                                            <p className="text-sm text-green-700">
                                                {successCount} of {results.length} contacts retrieved successfully
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Individual Results */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">Results</h3>
                                {results.map((result,) => {

                                    return (
                                        <div
                                            key={result.profile_id}
                                            className={`border rounded-lg p-4 ${result.success && (result.phone || result.email)
                                                ? 'border-green-200 bg-green-50'
                                                : result.error
                                                    ? 'border-red-200 bg-red-50'
                                                    : 'border-yellow-200 bg-yellow-50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    {getStatusIcon(result)}
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {result.first_name} {result.last_name}
                                                        </p>
                                                        {result.source && (
                                                            <p className="text-xs text-gray-600">
                                                                Source: {result.source === 'cache' ? '🗄️ Cache' : '⚡ Hatch API'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {/* Phone */}
                                                {result.phone ? (
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <Phone className="w-4 h-4 text-green-600" />
                                                        <span className="font-medium text-gray-700">Phone:</span>
                                                        <span className="text-gray-900 font-mono">{result.phone}</span>
                                                    </div>
                                                ) : result.errors?.phone ? (
                                                    <div className="flex items-center space-x-2 text-sm text-red-600">
                                                        <XCircle className="w-4 h-4" />
                                                        <span>Phone: {result.errors.phone}</span>
                                                    </div>
                                                ) : null}

                                                {/* Email */}
                                                {result.email ? (
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        <Mail className="w-4 h-4 text-blue-600" />
                                                        <span className="font-medium text-gray-700">Email:</span>
                                                        <span className="text-gray-900">{result.email}</span>
                                                    </div>
                                                ) : result.errors?.email ? (
                                                    <div className="flex items-center space-x-2 text-sm text-red-600">
                                                        <XCircle className="w-4 h-4" />
                                                        <span>Email: {result.errors.email}</span>
                                                    </div>
                                                ) : null}

                                                {/* Message */}
                                                {result.message && (
                                                    <p className="text-sm text-gray-600 italic">{result.message}</p>
                                                )}

                                                {/* Error */}
                                                {result.error && (
                                                    <p className="text-sm text-red-600">Error: {result.error}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-end space-x-3">
                        {!hasResults && !loading && (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onFetch}
                                    disabled={loading}
                                    className="px-6 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Fetch Contact Info
                                </button>
                            </>
                        )}
                        {hasResults && !loading && (
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors font-medium"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}