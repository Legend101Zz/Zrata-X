'use client';

import { useState, useEffect } from 'react';

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
    summary?: string;
    country?: string;
    companyLinkedinUrl?: string;
    companyUrl_cleaned?: string;
    industry?: string;
    companyUrl?: string;
    sequenceNo?: number;
    maxEmployeeSize?: string;
    minEmployeeSize?: string;
    location?: string;
  }>;
  education: Array<{
    major: string;
    universityUrl: string;
    campus: string;
    startDate: string;
    endDate: string;
    sequenceNo?: number;
    universityLinkedInUrl?: string;
    specialization?: string;
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

interface ProfileModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ profile, isOpen, onClose }: ProfileModalProps) {
  const [isShortlisted, setIsShortlisted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !profile) return null;

  const toggleShortlist = () => {
    setIsShortlisted(!isShortlisted);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-opacity-50 transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Profile Picture */}
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {profile.first_name?.charAt(0) || ''}{profile.last_name?.charAt(0) || ''}
                  </span>
                </div>
                
                {/* Basic Info */}
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Profile Name'}
                  </h2>
                  <p className="text-violet-100 text-lg">{profile.title?.toString() || 'N/A'}</p>
                  <div className="flex items-center space-x-4 text-violet-100 text-sm mt-1">
                    <span>{profile.location?.toString() || 'N/A'}</span>
                    {profile.current_industry && <span> • {profile.current_industry.toString()}</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleShortlist}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isShortlisted
                      ? 'bg-white text-violet-700'
                      : 'bg-violet-500 text-white hover:bg-violet-400'
                  }`}
                >
                  {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              
              {/* Professional Summary */}
              {profile.summary && profile.summary !== 'NA' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Professional Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{profile.summary?.toString() || 'N/A'}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column */}
                <div className="space-y-6">
                  
                  {/* Experience */}
                  {profile.experience && profile.experience.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 text-violet-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm3-2a1 1 0 00-1 1v1h2V5a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Professional Experience
                      </h4>
                      <div className="space-y-4">
                        {profile.experience.filter(exp => exp.title || exp.company || exp.startDate).map((exp, idx) => (
                          <div key={idx} className="border-l-4 border-violet-200 pl-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{(exp.title || 'Position').toString()}</h5>
                                <p className="text-violet-600 font-medium">{(exp.company || 'Company').toString()}</p>
                                {exp.current === 1 && (
                                  <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                    Current
                                  </span>
                                )}
                                {exp.summary && (
                                  <p className="text-sm text-gray-600 mt-2">{exp.summary?.toString() || 'N/A'}</p>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 text-right">
                                {exp.startDate && <div>{exp.startDate.toString()}</div>}
                                {exp.endDate && <div>{exp.endDate.toString()}</div>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {profile.education && profile.education.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 text-violet-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                        </svg>
                        Education
                      </h4>
                      <div className="space-y-3">
                        {profile.education.filter(edu => edu.major || edu.campus || edu.universityUrl).map((edu, idx) => (
                          <div key={idx} className="border-l-4 border-blue-200 pl-4">
                            <h5 className="font-semibold text-gray-900">{(edu.major || 'Degree').toString()}</h5>
                            <p className="text-blue-600 font-medium">{(edu.campus || 'Institution').toString()}</p>
                            <div className="text-sm text-gray-500 mt-1">
                              {edu.startDate && edu.endDate && `${edu.startDate.toString()} - ${edu.endDate.toString()}`}
                            </div>
                            {edu.specialization && (
                              <p className="text-sm text-gray-600 mt-1">Specialization: {edu.specialization?.toString() || 'N/A'}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {profile.certifications && profile.certifications.length > 0 && profile.certifications[0] !== 'NA' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 text-violet-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Certifications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.certifications.filter(cert => cert !== 'NA').map((cert, idx) => (
                          <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            {cert?.toString() || 'N/A'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  
                  {/* Key Information */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 text-violet-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Key Information
                    </h4>
                    <div className="space-y-3">
                      {profile.seniority_level && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Seniority Level</dt>
                          <dd className="text-sm text-gray-900">{profile.seniority_level?.toString() || 'N/A'}</dd>
                        </div>
                      )}
                      {profile.functional_area && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Functional Area</dt>
                          <dd className="text-sm text-gray-900">{profile.functional_area?.toString() || 'N/A'}</dd>
                        </div>
                      )}
                      {profile.expertise && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Expertise</dt>
                          <dd className="text-sm text-gray-900">{profile.expertise?.toString() || 'N/A'}</dd>
                        </div>
                      )}
                      {profile.departments && profile.departments.length > 0 && profile.departments[0] !== 'NA' && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Departments</dt>
                          <dd className="text-sm text-gray-900">
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profile.departments.filter(dept => dept !== 'NA').map((dept, idx) => (
                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {dept?.toString() || 'N/A'}
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
                                  {industry?.toString() || 'N/A'}
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
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 text-violet-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd" />
                        </svg>
                        Languages
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.filter(lang => lang !== 'NA').map((lang, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                            {lang?.toString() || 'N/A'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Achievements & Recognition */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 text-violet-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                      </svg>
                      Achievements & Recognition
                    </h4>
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

                  {/* Contact Information */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 text-violet-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Contact Information
                    </h4>
                    <div className="space-y-3">
                      {profile.linkedin_url && (
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                          </svg>
                          <a 
                            href={profile.linkedin_url.startsWith('http') ? profile.linkedin_url : `https://linkedin.com${profile.linkedin_url}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            LinkedIn Profile
                          </a>
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-900">{profile.location?.toString() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
