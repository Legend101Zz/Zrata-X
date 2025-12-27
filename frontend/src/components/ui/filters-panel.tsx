/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, Search, MapPin, Briefcase, Building2, Factory } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FiltersPanelProps {
    profiles: any[];
    onFilterChange: (filtered: any[]) => void;
}

interface FilterCounts {
    locations: Map<string, number>;
    jobTitles: Map<string, number>;
    industries: Map<string, number>;
    companies: Map<string, number>;
}

export default function FiltersPanel({ profiles, onFilterChange }: FiltersPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
    const [selectedJobTitles, setSelectedJobTitles] = useState<Set<string>>(new Set());
    const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
    const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    // Calculate filter counts
    const filterCounts = useMemo((): FilterCounts => {
        const locations = new Map<string, number>();
        const jobTitles = new Map<string, number>();
        const industries = new Map<string, number>();
        const companies = new Map<string, number>();

        profiles.forEach(profile => {
            if (profile.location && profile.location !== 'NA') {
                const loc = profile.location;
                locations.set(loc, (locations.get(loc) || 0) + 1);
            }

            if (profile.title && profile.title !== 'NA') {
                const title = profile.title.toLowerCase();
                jobTitles.set(title, (jobTitles.get(title) || 0) + 1);
            }

            if (profile.current_industry && profile.current_industry !== 'NA') {
                const industry = profile.current_industry;
                industries.set(industry, (industries.get(industry) || 0) + 1);
            }

            if (Array.isArray(profile.experience)) {
                profile.experience.forEach((exp: any) => {
                    if (exp.company && exp.company !== 'NA') {
                        companies.set(exp.company, (companies.get(exp.company) || 0) + 1);
                    }
                });
            }
        });

        return { locations, jobTitles, industries, companies };
    }, [profiles]);

    // Apply filters
    const applyFilters = () => {
        let filtered = profiles;

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(profile => {
                const name = `${profile.first_name || ''} ${profile.last_name || ''}`.toLowerCase();
                const title = (profile.title || '').toLowerCase();
                const expertise = (profile.expertise || '').toLowerCase();
                const industry = (profile.current_industry || '').toLowerCase();

                return name.includes(search) ||
                    title.includes(search) ||
                    expertise.includes(search) ||
                    industry.includes(search);
            });
        }

        if (selectedLocations.size > 0) {
            filtered = filtered.filter(profile =>
                selectedLocations.has(profile.location)
            );
        }

        if (selectedJobTitles.size > 0) {
            filtered = filtered.filter(profile =>
                selectedJobTitles.has(profile.title?.toLowerCase() || '')
            );
        }

        if (selectedIndustries.size > 0) {
            filtered = filtered.filter(profile =>
                selectedIndustries.has(profile.current_industry)
            );
        }

        if (selectedCompanies.size > 0) {
            filtered = filtered.filter(profile => {
                if (!Array.isArray(profile.experience)) return false;
                return profile.experience.some((exp: any) =>
                    selectedCompanies.has(exp.company)
                );
            });
        }

        onFilterChange(filtered);
    };

    useMemo(() => {
        applyFilters();
    }, [selectedLocations, selectedJobTitles, selectedIndustries, selectedCompanies, searchTerm]);

    const clearAllFilters = () => {
        setSelectedLocations(new Set());
        setSelectedJobTitles(new Set());
        setSelectedIndustries(new Set());
        setSelectedCompanies(new Set());
        setSearchTerm('');
    };

    const removeFilter = (type: 'location' | 'jobTitle' | 'industry' | 'company', value: string) => {
        switch (type) {
            case 'location':
                const newLocations = new Set(selectedLocations);
                newLocations.delete(value);
                setSelectedLocations(newLocations);
                break;
            case 'jobTitle':
                const newTitles = new Set(selectedJobTitles);
                newTitles.delete(value);
                setSelectedJobTitles(newTitles);
                break;
            case 'industry':
                const newIndustries = new Set(selectedIndustries);
                newIndustries.delete(value);
                setSelectedIndustries(newIndustries);
                break;
            case 'company':
                const newCompanies = new Set(selectedCompanies);
                newCompanies.delete(value);
                setSelectedCompanies(newCompanies);
                break;
        }
    };

    const activeFilterCount =
        selectedLocations.size +
        selectedJobTitles.size +
        selectedIndustries.size +
        selectedCompanies.size +
        (searchTerm ? 1 : 0);

    const FilterSection = ({
        title,
        icon,
        items,
        selected,
        onToggle,
        type
    }: {
        title: string;
        icon: React.ReactNode;
        items: Map<string, number>;
        selected: Set<string>;
        onToggle: (item: string) => void;
        type: 'location' | 'jobTitle' | 'industry' | 'company';
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const sortedItems = Array.from(items.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        if (sortedItems.length === 0) return null;

        return (
            <div className="bg-white rounded-lg border border-gray-200">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 transition-colors rounded-lg"
                >
                    <div className="flex items-center gap-2">
                        <div className="text-violet-600">{icon}</div>
                        <span className="text-sm font-medium text-gray-900">{title}</span>
                        {selected.size > 0 && (
                            <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                                {selected.size}
                            </span>
                        )}
                    </div>
                    {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-3 pt-1 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                {sortedItems.map(([item, count]) => (
                                    <label
                                        key={item}
                                        className="flex items-center gap-3 text-sm text-gray-700 hover:bg-violet-50 px-2 py-2 rounded-md cursor-pointer transition-colors group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.has(item)}
                                            onChange={() => onToggle(item)}
                                            className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-2 focus:ring-violet-500 cursor-pointer"
                                        />
                                        <span className="flex-1 truncate group-hover:text-gray-900" title={item}>
                                            {item}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors">
                                            {count}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            {/* Quick Filter Bar */}
            <div className="bg-white px-6 py-3">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search Bar */}
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, title, skills..."
                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm bg-white"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                            ${isExpanded
                                ? 'bg-violet-100 text-violet-700 border-2 border-violet-200'
                                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-violet-300 hover:bg-violet-50'
                            }
                        `}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Advanced Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="text-sm text-violet-600 hover:text-violet-700 font-medium px-3 py-2 hover:bg-violet-50 rounded-lg transition-colors"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>

                {/* Active Filters Pills */}
                {activeFilterCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 flex flex-wrap gap-2"
                    >
                        {Array.from(selectedLocations).map(loc => (
                            <span key={loc} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                                <MapPin className="w-3 h-3" />
                                {loc}
                                <button onClick={() => removeFilter('location', loc)} className="hover:text-violet-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {Array.from(selectedJobTitles).map(title => (
                            <span key={title} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                <Briefcase className="w-3 h-3" />
                                {title}
                                <button onClick={() => removeFilter('jobTitle', title)} className="hover:text-blue-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {Array.from(selectedIndustries).map(industry => (
                            <span key={industry} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <Factory className="w-3 h-3" />
                                {industry}
                                <button onClick={() => removeFilter('industry', industry)} className="hover:text-green-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {Array.from(selectedCompanies).map(company => (
                            <span key={company} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                <Building2 className="w-3 h-3" />
                                {company}
                                <button onClick={() => removeFilter('company', company)} className="hover:text-orange-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Expanded Filters Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden bg-gray-50"
                    >
                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FilterSection
                                    title="Locations"
                                    icon={<MapPin className="w-4 h-4" />}
                                    items={filterCounts.locations}
                                    selected={selectedLocations}
                                    type="location"
                                    onToggle={(item) => {
                                        const newSet = new Set(selectedLocations);
                                        if (newSet.has(item)) {
                                            newSet.delete(item);
                                        } else {
                                            newSet.add(item);
                                        }
                                        setSelectedLocations(newSet);
                                    }}
                                />

                                <FilterSection
                                    title="Job Titles"
                                    icon={<Briefcase className="w-4 h-4" />}
                                    items={filterCounts.jobTitles}
                                    selected={selectedJobTitles}
                                    type="jobTitle"
                                    onToggle={(item) => {
                                        const newSet = new Set(selectedJobTitles);
                                        if (newSet.has(item)) {
                                            newSet.delete(item);
                                        } else {
                                            newSet.add(item);
                                        }
                                        setSelectedJobTitles(newSet);
                                    }}
                                />

                                <FilterSection
                                    title="Industries"
                                    icon={<Factory className="w-4 h-4" />}
                                    items={filterCounts.industries}
                                    selected={selectedIndustries}
                                    type="industry"
                                    onToggle={(item) => {
                                        const newSet = new Set(selectedIndustries);
                                        if (newSet.has(item)) {
                                            newSet.delete(item);
                                        } else {
                                            newSet.add(item);
                                        }
                                        setSelectedIndustries(newSet);
                                    }}
                                />

                                <FilterSection
                                    title="Companies"
                                    icon={<Building2 className="w-4 h-4" />}
                                    items={filterCounts.companies}
                                    selected={selectedCompanies}
                                    type="company"
                                    onToggle={(item) => {
                                        const newSet = new Set(selectedCompanies);
                                        if (newSet.has(item)) {
                                            newSet.delete(item);
                                        } else {
                                            newSet.add(item);
                                        }
                                        setSelectedCompanies(newSet);
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}