'use client';

import { useState } from 'react';

interface Profile {
  first_name: string;
  last_name: string;
  title: string;
  location: string;
  country: string;
  seniority_level: string;
  current_industry: string;
  experience: Array<{
    title: string;
    company: string;
    current: number;
    startDate: string;
    endDate: string;
  }>;
  education: Array<{
    major: string;
    universityUrl: string;
    campus: string;
    startDate: string;
    endDate: string;
  }>;
  linkedin_url: string;
  summary: string;
  expertise: string;
  functional_area: string;
  departments: string[];
  languages: string[];
  certifications: string[];
  publications: string[];
  patents: string[];
  awards: string[];
  memberships: string[];
  prior_industries: string[];
  organization_id: string;
  profile_picture: string;
  state: string;
  city: string;
}

interface ResultsTableProps {
  profiles: Profile[];
}

export default function ResultsTable({ profiles }: ResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [shortlistedProfiles, setShortlistedProfiles] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const toggleShortlist = (index: number) => {
    const newShortlisted = new Set(shortlistedProfiles);
    if (newShortlisted.has(index)) {
      newShortlisted.delete(index);
    } else {
      newShortlisted.add(index);
    }
    setShortlistedProfiles(newShortlisted);
  };

  const getPreviewFields = (profile: Profile, index: number) => {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    const location = profile.location || profile.city || profile.country || 'N/A';
    const currentRole = profile.experience?.find(exp => exp.current === 1)?.title || profile.title || 'N/A';
    const currentCompany = profile.experience?.find(exp => exp.current === 1)?.company || 'N/A';
    const industry = profile.current_industry || 'N/A';
    const seniority = profile.seniority_level || 'N/A';
    const education = profile.education?.[0]?.major || profile.education?.[0]?.campus || 'N/A';

    return {
      rank: index + 1,
      name: fullName || 'N/A',
      location,
      currentRole,
      currentCompany,
      industry,
      seniority,
      education
    };
  };


  return (
    <div className="w-full h-full overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">All Profiles ({profiles.length})</h1>
              <p className="text-gray-600">{profiles.length} profiles found</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  const allIndices = profiles.map((_, index) => index);
                  setExpandedRows(new Set(allIndices));
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={() => {
                  const allIndices = profiles.map((_, index) => index);
                  setShortlistedProfiles(new Set(allIndices));
                }}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors"
              >
                Shortlist All
              </button>
            </div>
          </div>
        </div>
        
        {/* Profile Tiles */}
        <div className="space-y-0">
          {profiles.map((profile, index) => {
            const preview = getPreviewFields(profile, index);
            const isExpanded = expandedRows.has(index);
            const isShortlisted = shortlistedProfiles.has(index);
            
            return (
              <div key={index} className="bg-white border-b border-gray-200">
                {/* Main Profile Tile */}
                <div className="px-6 py-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 flex-1">
                      {/* Profile Picture */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-violet-600 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {profile.first_name?.charAt(0) || ''}{profile.last_name?.charAt(0) || ''}
                          </span>
                        </div>
                      </div>
                      
                      {/* Profile Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {preview.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {profile.linkedin_url && (
                              <a 
                                href={profile.linkedin_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                                </svg>
                              </a>
                            )}
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          {preview.currentRole} {preview.currentCompany && `at ${preview.currentCompany}`}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{preview.location}</span>
                          <span>•</span>
                          <span>{preview.education}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleShortlist(index)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          isShortlisted
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                      </button>
                      <button
                        onClick={() => toggleExpanded(index)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {/* Professional Summary */}
                    {profile.summary && profile.summary !== 'NA' && (
                      <div className="px-6 py-4 bg-white border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Summary</h3>
                        <p className="text-gray-700 leading-relaxed">
                          {profile.summary}
                        </p>
                      </div>
                    )}
                    
                    {/* Main Content Grid */}
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          
                          {/* Experience */}
                          {profile.experience && profile.experience.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">Professional Experience</h4>
                              <div className="space-y-3">
                                {profile.experience.filter(exp => exp.title || exp.company || exp.startDate).map((exp, idx) => (
                                  <div key={idx} className="border-l-4 border-violet-200 pl-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h5 className="font-semibold text-gray-900">{exp.title || 'Position'}</h5>
                                        <p className="text-violet-600 font-medium">{exp.company || 'Company'}</p>
                                        {exp.current === 1 && (
                                          <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                            Current
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-500 text-right">
                                        {exp.startDate && <div>{exp.startDate}</div>}
                                        {exp.endDate && <div>{exp.endDate}</div>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {profile.education && profile.education.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">Education</h4>
                              <div className="space-y-3">
                                {profile.education.filter(edu => edu.major || edu.campus || edu.universityUrl).map((edu, idx) => (
                                  <div key={idx} className="border-l-4 border-blue-200 pl-4">
                                    <h5 className="font-semibold text-gray-900">{edu.major || 'Degree'}</h5>
                                    <p className="text-blue-600 font-medium">{edu.campus || 'Institution'}</p>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {edu.startDate && edu.endDate && `${edu.startDate} - ${edu.endDate}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Certifications */}
                          {profile.certifications && profile.certifications.length > 0 && profile.certifications[0] !== 'NA' && (
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h4>
                              <div className="flex flex-wrap gap-2">
                                {profile.certifications.filter(cert => cert !== 'NA').map((cert, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                    {cert}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          
                          {/* Key Information */}
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Key Information</h4>
                            <div className="space-y-3">
                              {profile.functional_area && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Functional Area</dt>
                                  <dd className="text-sm text-gray-900">{profile.functional_area}</dd>
                                </div>
                              )}
                              {profile.expertise && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Expertise</dt>
                                  <dd className="text-sm text-gray-900">{profile.expertise}</dd>
                                </div>
                              )}
                              {profile.departments && profile.departments.length > 0 && profile.departments[0] !== 'NA' && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Departments</dt>
                                  <dd className="text-sm text-gray-900">
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {profile.departments.filter(dept => dept !== 'NA').map((dept, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                          {dept}
                                        </span>
                                      ))}
                                    </div>
                                  </dd>
                                </div>
                              )}
                              {profile.prior_industries && profile.prior_industries.length > 0 && profile.prior_industries[0] !== 'NA' && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Previous Industries</dt>
                                  <dd className="text-sm text-gray-900">
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {profile.prior_industries.filter(industry => industry !== 'NA').map((industry, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                          {industry}
                                        </span>
                                      ))}
                                    </div>
                                  </dd>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Languages */}
                          {profile.languages && profile.languages.length > 0 && profile.languages[0] !== 'NA' && (
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">Languages</h4>
                              <div className="flex flex-wrap gap-2">
                                {profile.languages.filter(lang => lang !== 'NA').map((lang, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Additional Achievements */}
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Achievements & Recognition</h4>
                            <div className="space-y-4">
                              {profile.awards && profile.awards.length > 0 && profile.awards[0] !== 'NA' && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500 mb-2">Awards</dt>
                                  <div className="space-y-1">
                                    {profile.awards.filter(award => award !== 'NA').map((award, idx) => (
                                      <div key={idx} className="flex items-center space-x-2">
                                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-900">{award}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {profile.publications && profile.publications.length > 0 && profile.publications[0] !== 'NA' && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500 mb-2">Publications</dt>
                                  <div className="space-y-1">
                                    {profile.publications.filter(pub => pub !== 'NA').map((pub, idx) => (
                                      <div key={idx} className="flex items-center space-x-2">
                                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm text-gray-900">{pub}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {profile.patents && profile.patents.length > 0 && profile.patents[0] !== 'NA' && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500 mb-2">Patents</dt>
                                  <div className="space-y-1">
                                    {profile.patents.filter(patent => patent !== 'NA').map((patent, idx) => (
                                      <div key={idx} className="flex items-center space-x-2">
                                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm text-gray-900">{patent}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {profile.memberships && profile.memberships.length > 0 && profile.memberships[0] !== 'NA' && (
                                <div>
                                  <dt className="text-sm font-medium text-gray-500 mb-2">Professional Memberships</dt>
                                  <div className="flex flex-wrap gap-1">
                                    {profile.memberships.filter(membership => membership !== 'NA').map((membership, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                                        {membership}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        {shortlistedProfiles.size > 0 && (
          <div className="bg-violet-100 px-6 py-4 border-t border-gray-200">
            <p className="text-violet-800 font-medium">
              {shortlistedProfiles.size} profile(s) shortlisted
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
