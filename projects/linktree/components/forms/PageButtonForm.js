'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SectionBox from '../layout/SectionBox';
import { faGripLines, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';
import SubmitButton from '../buttons/SubmitButton';
import { SavePageButton } from '@/action/PageAction';
import { toast } from 'react-toastify';
import { ReactSortable } from 'react-sortablejs';
import { allButtons, getSocialButton } from '@/lib/socialButtons';

const PageButtonForm = ({ page, onButtonsChange }) => {
  const pageSavedButtonsKeys = Object.keys(page?.buttons || {});
  const pageSavedButtonsData = pageSavedButtonsKeys
    .map((key) => getSocialButton(key))
    .filter(Boolean);

  const [activeButtons, setActiveButtons] = useState(pageSavedButtonsData || []);
  const [buttonValues, setButtonValues] = useState(page?.buttons || {});

  useEffect(() => {
    if (onButtonsChange) {
      onButtonsChange(buttonValues);
    }
  }, [buttonValues, onButtonsChange]);

  const addButtonToProfile = (button) => {
    setActiveButtons((prev) => [...prev, button]);
    setButtonValues((prev) => ({ ...prev, [button.key]: '' }));
  };

  const availableButtons = allButtons.filter(
    (b1) => !activeButtons.find((b2) => b1.key === b2.key)
  );

  const saveButton = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const result = await SavePageButton(formData);
    if (result?.success) {
      toast.success('Buttons saved successfully');
    } else {
      toast.error(
        result?.retryAfter
          ? `${result.error} (${result.retryAfter}s)`
          : result?.error || 'Failed to save buttons'
      );
    }
  };

  const removeButton = (button) => {
    setActiveButtons((prev) => prev.filter((b) => b.key !== button.key));
    setButtonValues((prev) => {
      const newValues = { ...prev };
      delete newValues[button.key];
      return newValues;
    });
  };

  return (
    <SectionBox title="Buttons">
      <form onSubmit={saveButton} className="space-y-6">

        <ReactSortable
          handle=".grip"
          list={activeButtons}
          setList={setActiveButtons}
          className="space-y-4"
        >
          {activeButtons.map((b) => (
            <div
              key={b.key}
              className="flex flex-col md:flex-row items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3 min-w-[150px]">
                <FontAwesomeIcon
                  className="cursor-move grip text-slate-400 hover:text-slate-600 transition-colors"
                  icon={faGripLines}
                />
                <FontAwesomeIcon
                  icon={b.icon}
                  style={{ color: b.color || '#64748b' }}
                />
                <span className="capitalize font-medium text-slate-700">
                  {b.label}
                </span>
              </div>

              <div className="flex grow w-full md:w-auto">
                <input
                  value={buttonValues[b.key] || ''}
                  onChange={(e) =>
                    setButtonValues((prev) => ({
                      ...prev,
                      [b.key]: e.target.value,
                    }))
                  }
                  name={b.key}
                  placeholder={b.placeholder}
                  type="text"
                  className="w-full px-4 py-2 rounded-l-lg border border-slate-200 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                           transition-all"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => removeButton(b)}
                  aria-label={`Remove ${b.label} button`}
                  className="px-4 py-2 min-h-[44px] min-w-[44px] bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 
                           rounded-r-xl border-y border-r border-slate-200
                           transition-colors duration-150 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))}
        </ReactSortable>

        <div className="flex flex-wrap gap-2.5 mt-6 border-y border-slate-100 py-6">
          {availableButtons.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => addButtonToProfile(b)}
              aria-label={`Add ${b.label} button to profile`}
              className="flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-slate-50 hover:bg-slate-100 active:scale-95 
                       text-slate-700 rounded-xl transition-all duration-150 border border-slate-200/80 shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer text-sm font-medium"
            >
              <FontAwesomeIcon
                icon={b.icon}
                style={{ color: b.color || '#64748b' }}
              />
              <span className="capitalize">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <SubmitButton className="px-6">
            <FontAwesomeIcon icon={faSave} className="text-lg" />
            <span>Save Changes</span>
          </SubmitButton>
        </div>
      </form>
    </SectionBox>
  );
};

export default PageButtonForm;