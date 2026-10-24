import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { STANDARDIZED_SPECIALIZATIONS } from "../../../constants/specializations";
import { useI18n } from "../../../i18n";

interface SpecializationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onClearError?: () => void;
  disabled?: boolean;
}

export function SpecializationCombobox({
  value,
  onChange,
  error,
  onClearError,
  disabled = false,
}: SpecializationComboboxProps) {
  const { locale } = useI18n();
  const isRtl = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Check if current input contains Arabic characters
  const hasArabic = useMemo(() => {
    return /[\u0600-\u06FF]/.test(searchTerm);
  }, [searchTerm]);

  // Filter options based on user typing
  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return STANDARDIZED_SPECIALIZATIONS;
    return STANDARDIZED_SPECIALIZATIONS.filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) ||
        opt.titleEn.toLowerCase().includes(q) ||
        opt.titleAr.includes(q),
    );
  }, [searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchTerm(text);
    onChange(text);
    if (onClearError) onClearError();
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    setSearchTerm(val);
    onChange(val);
    if (onClearError) onClearError();
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          dir="ltr"
          value={searchTerm}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          placeholder="e.g. UI/UX Designer, Frontend Developer, AI Engineer..."
          className={`field-control font-mono text-sm pe-10 ${
            error || hasArabic
              ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
              : ""
          }`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          role="combobox"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute inset-y-0 end-0 flex items-center pe-3 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in slide-in-from-top-2 duration-150">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = value.trim().toLowerCase() === opt.value.toLowerCase();
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-xs transition-colors ${
                      isSelected
                        ? "bg-neutral-100 font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100" dir="ltr">
                        {opt.titleEn}
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {opt.titleAr}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-100" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2.5 text-center text-xs text-neutral-500">
                <span>
                  {isRtl
                    ? "يمكنك استخدام المسمى المخصص الذي كتبته أعلاه"
                    : "Custom specialization will be applied"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Friendly UX warning when typing Arabic */}
      {hasArabic && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in duration-150"
        >
          <p className="font-medium">
            💡 يرجى كتابة المسمى الوظيفي باللغة الإنجليزية (مثال: UI/UX Designer أو Frontend Developer)؛ وذلك لأن مستكشف الوظائف يستخدم هذا المسمى للبحث التلقائي المباشر داخل محركات التوظيف العالمية.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && !hasArabic && (
        <p role="alert" className="text-xs text-danger-strong font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
