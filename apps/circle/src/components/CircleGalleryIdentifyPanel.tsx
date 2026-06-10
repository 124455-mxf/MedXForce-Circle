import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import type { GalleryTagPerson } from '@medxforce/shared';
import { cn } from '../lib/utils';

function filterTagPeople(people: GalleryTagPerson[], query: string): GalleryTagPerson[] {
  const q = query.trim().toLowerCase();
  if (!q) return people;
  return people.filter(
    (person) =>
      person.name.toLowerCase().includes(q) ||
      (person.relationship?.toLowerCase().includes(q) ?? false),
  );
}

type CircleGalleryIdentifyPanelProps = {
  people: GalleryTagPerson[];
  mediaId: string;
  isTagged: (personId: string) => boolean;
  onToggle: (person: GalleryTagPerson) => void;
  onCreateAndTag: (name: string, relationship: string) => void | Promise<void>;
  onClose: () => void;
};

export function CircleGalleryIdentifyPanel({
  people,
  isTagged,
  onToggle,
  onCreateAndTag,
  onClose,
}: CircleGalleryIdentifyPanelProps) {
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRelationship, setNewPersonRelationship] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const filteredPeople = useMemo(
    () => filterTagPeople(people, searchQuery),
    [people, searchQuery],
  );

  useEffect(() => {
    if (!isAddingNewPerson) return;
    nameInputRef.current?.focus({ preventScroll: true });
  }, [isAddingNewPerson]);

  const closeAddForm = () => {
    setIsAddingNewPerson(false);
    setNewPersonName('');
    setNewPersonRelationship('');
  };

  const handleCreate = async () => {
    if (!newPersonName.trim() || saving) return;
    setSaving(true);
    try {
      await onCreateAndTag(newPersonName, newPersonRelationship);
      closeAddForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-x-4 bottom-24 z-30 max-w-lg mx-auto">
      <div className="bg-white rounded-[28px] shadow-2xl border border-slate-100 max-h-[55vh] flex flex-col overflow-hidden">
        <div className="shrink-0 p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Identify someone</h4>
              <p className="text-sm text-slate-500">Who is in this picture?</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingNewPerson((open) => !open)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                  isAddingNewPerson
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                )}
              >
                + New Person
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {isAddingNewPerson && (
            <div className="mt-4 p-4 rounded-2xl bg-blue-50/80 border border-blue-100 space-y-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                Add someone new
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Name
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Enter name..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={newPersonRelationship}
                    onChange={(e) => setNewPersonRelationship(e.target.value)}
                    placeholder="e.g., Granddaughter..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreate();
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddForm}
                  className="px-4 py-2 text-slate-500 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={!newPersonName.trim() || saving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50"
                >
                  Add &amp; Tag
                </button>
              </div>
            </div>
          )}
          {people.length > 0 && (
            <div className="mt-4 relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or relationship..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Search people"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {people.length === 0 && !isAddingNewPerson ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No people listed yet. Tap + New Person above to add someone in this photo.
            </p>
          ) : people.length > 0 ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                {isAddingNewPerson ? 'Or pick from list' : 'Pick from list'}
              </p>
              {filteredPeople.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  No matches for &ldquo;{searchQuery.trim()}&rdquo;
                </p>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPeople.map((person) => {
                  const tagged = isTagged(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => onToggle(person)}
                      className={cn(
                        'p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2',
                        tagged
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100'
                          : 'bg-slate-50 border-slate-100 hover:border-blue-100',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate text-sm">{person.name}</p>
                        {person.relationship ? (
                          <p className="text-xs text-slate-500 truncate">{person.relationship}</p>
                        ) : null}
                      </div>
                      {tagged ? <Check size={18} className="text-blue-500 shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
