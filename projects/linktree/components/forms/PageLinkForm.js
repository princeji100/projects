'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SectionBox from '../layout/SectionBox';
import {
  faCloudArrowUp,
  faGripLines,
  faLink,
  faPlus,
  faSave,
  faTrash,
  faCalendarAlt,
  faClock,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import SubmitButton from '../buttons/SubmitButton';
import { useState } from 'react';
import { ReactSortable } from 'react-sortablejs';
import upload from '@/lib/upload';
import Image from 'next/image';
import { SavePageLinks } from '@/action/PageAction';
import { toast } from 'react-toastify';
import { getLinkLifecycleStatus } from '@/lib/linkLifecycle';

function toLocalDatetimeInput(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function fromLocalDatetimeInput(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const PageLinkForm = ({ page }) => {
  const [links, setLinks] = useState(page?.links || []);
  const [openScheduleIndex, setOpenScheduleIndex] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    const result = await SavePageLinks(links);
    if (result?.success) {
      toast.success('Links saved successfully');
    } else {
      toast.error(
        result?.retryAfter
          ? `${result.error} (${result.retryAfter}s)`
          : result?.error || 'Failed to save links'
      );
    }
  };

  const addNewLink = () => {
    setLinks((prevs) => [
      ...prevs,
      {
        title: '',
        subtitle: '',
        icon: '',
        url: '',
        active: true,
        startsAt: null,
        endsAt: null,
      },
    ]);
  };

  const handelUpload = async (e, index) => {
    await upload(e, (uplodedImageUrl) => {
      setLinks((prevs) =>
        prevs.map((link, i) =>
          i === index ? { ...link, icon: uplodedImageUrl } : link
        )
      );
    });
  };

  const handelLinkChange = (index, prop, value) => {
    setLinks((prevs) =>
      prevs.map((link, i) => (i === index ? { ...link, [prop]: value } : link))
    );
  };

  const removeLink = (indexToRemove) => {
    setLinks((prevLinks) =>
      prevLinks.filter((_, index) => index !== indexToRemove)
    );
  };

  const toggleSchedulePanel = (index) => {
    setOpenScheduleIndex(openScheduleIndex === index ? null : index);
  };

  const clearSchedule = (index) => {
    setLinks((prevs) =>
      prevs.map((link, i) =>
        i === index ? { ...link, startsAt: null, endsAt: null } : link
      )
    );
  };

  const renderBadge = (link) => {
    const status = getLinkLifecycleStatus(link);

    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Live
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px]" />
            Scheduled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FontAwesomeIcon icon={faClock} className="text-[10px]" />
            Expired
          </span>
        );
      case 'inactive':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Inactive
          </span>
        );
    }
  };

  return (
    <SectionBox>
      <form onSubmit={save} className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Links</h2>
            <p className="text-xs text-slate-500 mt-1">
              Manage your links, active visibility, and automated scheduling
            </p>
          </div>
          <button
            type="button"
            onClick={addNewLink}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 font-medium"
          >
            <FontAwesomeIcon
              className="bg-blue-600 text-white p-1.5 rounded-full w-5 h-5"
              icon={faPlus}
            />
            <span>Add new</span>
          </button>
        </div>

        <ReactSortable
          handle=".handle"
          list={links}
          setList={setLinks}
          className="space-y-6"
        >
          {links.map((link, index) => {
            const hasSchedule = Boolean(link.startsAt || link.endsAt);
            const isScheduleOpen = openScheduleIndex === index || hasSchedule;

            return (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4"
              >
                {/* Top Bar: Handle, Status Badge & Active Toggle */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="handle cursor-move text-slate-400 hover:text-slate-600 transition-colors p-1">
                      <FontAwesomeIcon icon={faGripLines} className="text-lg" />
                    </div>
                    {renderBadge(link)}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={link.active !== false}
                        onChange={(e) =>
                          handelLinkChange(index, 'active', e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-2 text-xs font-medium text-slate-600 select-none">
                        {link.active !== false ? 'Live' : 'Hidden'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Main Link Content */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center gap-3 min-w-[180px]">
                    <div className="relative w-16 h-16 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      {link.icon ? (
                        <Image
                          src={link.icon}
                          fill
                          className="object-cover"
                          alt={link.title || 'Link icon'}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FontAwesomeIcon
                            icon={faLink}
                            className="text-2xl text-slate-400"
                          />
                        </div>
                      )}
                    </div>

                    <label className="w-full">
                      <input
                        onChange={(e) => handelUpload(e, index)}
                        id={`icon-${index}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                      />
                      <span className="flex items-center justify-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                        <FontAwesomeIcon icon={faCloudArrowUp} />
                        Change icon
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Remove
                    </button>
                  </div>

                  <div className="grow space-y-3">
                    <div>
                      <label
                        htmlFor={`title-${index}`}
                        className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider"
                      >
                        Title
                      </label>
                      <input
                        id={`title-${index}`}
                        type="text"
                        value={link.title || ''}
                        onChange={(e) =>
                          handelLinkChange(index, 'title', e.target.value)
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                        placeholder="e.g. My Portfolio"
                        spellCheck="false"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`subtitle-${index}`}
                        className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider"
                      >
                        Subtitle (optional)
                      </label>
                      <input
                        id={`subtitle-${index}`}
                        type="text"
                        value={link.subtitle || ''}
                        onChange={(e) =>
                          handelLinkChange(index, 'subtitle', e.target.value)
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                        placeholder="e.g. Check out my latest work"
                        spellCheck="false"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`url-${index}`}
                        className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider"
                      >
                        URL
                      </label>
                      <input
                        id={`url-${index}`}
                        type="url"
                        value={link.url || ''}
                        onChange={(e) =>
                          handelLinkChange(index, 'url', e.target.value)
                        }
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                        placeholder="https://example.com"
                        spellCheck="false"
                      />
                    </div>
                  </div>
                </div>

                {/* Scheduling Section */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleSchedulePanel(index)}
                      className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-2 transition-colors py-1"
                    >
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500" />
                      <span>
                        Schedule publishing & expiration
                        {hasSchedule && (
                          <span className="ml-1.5 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Active Schedule
                          </span>
                        )}
                      </span>
                      <FontAwesomeIcon
                        icon={isScheduleOpen ? faChevronUp : faChevronDown}
                        className="text-[10px] text-slate-400"
                      />
                    </button>

                    {hasSchedule && (
                      <button
                        type="button"
                        onClick={() => clearSchedule(index)}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear schedule
                      </button>
                    )}
                  </div>

                  {isScheduleOpen && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60 grid sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor={`startsAt-${index}`}
                          className="block text-xs font-medium text-slate-600 mb-1"
                        >
                          Start Date & Time (optional)
                        </label>
                        <input
                          id={`startsAt-${index}`}
                          type="datetime-local"
                          value={toLocalDatetimeInput(link.startsAt)}
                          onChange={(e) =>
                            handelLinkChange(
                              index,
                              'startsAt',
                              fromLocalDatetimeInput(e.target.value)
                            )
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Link stays hidden until this time
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor={`endsAt-${index}`}
                          className="block text-xs font-medium text-slate-600 mb-1"
                        >
                          Expiration Date & Time (optional)
                        </label>
                        <input
                          id={`endsAt-${index}`}
                          type="datetime-local"
                          value={toLocalDatetimeInput(link.endsAt)}
                          onChange={(e) =>
                            handelLinkChange(
                              index,
                              'endsAt',
                              fromLocalDatetimeInput(e.target.value)
                            )
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Link expires and hides after this time
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </ReactSortable>

        <div className="border-t border-slate-100 pt-6">
          <SubmitButton className="mx-auto max-w-xs flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faSave} />
            <span>Save Changes</span>
          </SubmitButton>
        </div>
      </form>
    </SectionBox>
  );
};

export default PageLinkForm;