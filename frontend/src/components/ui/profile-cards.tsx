/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
//@ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import ProfileModal from './profile-modal';
import { SparklesIcon } from 'lucide-react';
import { Profile } from '@/types/profile';

interface ProfileCardsProps {
  profiles: any[];
  selectedProfiles?: Set<string>;
  onSelectProfile?: (profileId: string) => void;
}

export default function ProfileCards({
  profiles,
  selectedProfiles = new Set(),
  onSelectProfile
}: ProfileCardsProps) {
  const [shortlistedProfiles, setShortlistedProfiles] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check which profiles are already shortlisted when component loads
  useEffect(() => {
    const checkShortlistedProfiles = () => {
      try {
        const stored = localStorage.getItem('shortlistedProfiles');
        if (stored) {
          const shortlistedProfilesList = JSON.parse(stored);
          const shortlistedIds = new Set(
            shortlistedProfilesList.map((p: Profile) => p._id || p.organization_id)
          );
          setShortlistedProfiles(shortlistedIds);
        }
      } catch (error) {
        console.error('Error checking shortlisted profiles:', error);
      }
    };

    checkShortlistedProfiles();
  }, [profiles]);

  const toggleShortlist = (profile: any) => {
    const profileId = profile._id || profile.organization_id;
    const newShortlisted = new Set(shortlistedProfiles);

    if (newShortlisted.has(profileId)) {
      newShortlisted.delete(profileId);
    } else {
      newShortlisted.add(profileId);
    }
    setShortlistedProfiles(newShortlisted);

    // Update localStorage with shortlisted profiles
    const stored = localStorage.getItem('shortlistedProfiles');
    let shortlistedProfilesList: Profile[] = stored ? JSON.parse(stored) : [];

    if (newShortlisted.has(profileId)) {
      // Add to shortlist
      const profileWithMetadata = {
        ...profile,
        shortlistedAt: new Date().toISOString(),
        sessionId: window.location.pathname.split('/').pop()
      };
      shortlistedProfilesList.push(profileWithMetadata);
    } else {
      // Remove from shortlist
      shortlistedProfilesList = shortlistedProfilesList.filter(
        p => (p._id || p.organization_id) !== profileId
      );
    }

    localStorage.setItem('shortlistedProfiles', JSON.stringify(shortlistedProfilesList));

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('shortlistUpdated', {
      detail: { count: shortlistedProfilesList.length }
    }));
  };

  const openProfileModal = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const highlightKeywords = (text: string) => {
    const keywords = [
      'over two decades of experience',
      'low-latency, high-capacity trading systems',
      'distributed systems',
      'Go',
      'financial sector',
      'financial services domain'
    ];

    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<span class="bg-yellow-200 font-semibold">$1</span>'
      );
    });

    return highlightedText;
  };

  if (profiles.length === 0) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-12">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No profiles found</h3>
          <p className="text-sm text-gray-500">Try adjusting your filters to see more results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Profile Cards */}
      <div className="p-6 space-y-4">
        {profiles.map((profile) => {
          const profileId = profile._id || profile.organization_id;
          const isSelected = selectedProfiles.has(profileId);
          const isShortlisted = shortlistedProfiles.has(profileId);

          // Get current role
          const currentRole = profile.experience?.find((exp: any) => exp.current === 1)?.title ||
            profile.title ||
            'No current role';

          // Get education
          const education = profile.education?.[0]?.major ||
            profile.education?.[0]?.campus ||
            'Education not available';

          // Get summary
          const summary = profile.summary && profile.summary !== 'NA'
            ? profile.summary
            : `${profile.first_name || ''} ${profile.last_name || ''}`.trim() +
            ' has a missing description, so no summary is available for this profile';

          // Get match score
          const matchScore = profile.followup_match_score
            ? Math.round(profile.followup_match_score * 100)
            : null;

          return (
            <div
              key={profileId}
              className={`
                relative border rounded-xl p-6 transition-all
                ${isSelected
                  ? 'border-violet-300 bg-violet-50 shadow-md ring-2 ring-violet-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                {onSelectProfile && (
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectProfile(profileId);
                      }}
                      className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                    />
                  </div>
                )}

                {/* Profile Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'No Name'}
                        </h3>

                        {/* Match Score Badge */}
                        {matchScore !== null && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">
                            {matchScore}% Match
                          </span>
                        )}

                        {/* Action Icons */}
                        <div className="flex items-center gap-2 ml-auto">
                          {profile.linkedin_url && profile.linkedin_url !== 'NA' && (
                            <a
                              href={`https://linkedin.com${profile.linkedin_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                              title="View LinkedIn Profile"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </a>
                          )}

                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-gray-900 font-medium">{currentRole}</p>
                        <p className="text-gray-600">
                          {profile.location && profile.location !== 'NA' ? profile.location : 'Location not available'}
                        </p>
                        <p className="text-gray-600">{education}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-start gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShortlist(profile);
                        }}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-all
                          ${isShortlisted
                            ? 'bg-violet-600 text-white hover:bg-violet-700'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-violet-300 hover:bg-violet-50'
                          }
                        `}
                      >
                        {isShortlisted ? '✓ Shortlisted' : 'Shortlist'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openProfileModal(profile);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>

                  {/* Summary with AI Highlights */}
                  <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-100">
                    <div className="flex items-start gap-2">
                      <SparklesIcon className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                      <p
                        className="text-sm text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: highlightKeywords(summary) }}
                      />
                    </div>
                  </div>

                  {/* Quick Info Pills */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.current_industry && profile.current_industry !== 'NA' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {profile.current_industry}
                      </span>
                    )}
                    {profile.seniority_level && profile.seniority_level !== 'NA' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {profile.seniority_level}
                      </span>
                    )}
                    {profile.functional_area && profile.functional_area !== 'NA' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {profile.functional_area}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        profile={selectedProfile}
        isOpen={isModalOpen}
        onClose={closeProfileModal}
      />
    </div >
  );
}