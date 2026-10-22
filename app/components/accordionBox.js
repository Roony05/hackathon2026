/**
 * Expandable accordion to display extra information at user's descretion.
 * @param {HTML} title - title of this accordion passed from the parent.
 * @param {HTML} children - content pass to be shown
 * @param {HTML} isOpen - parent state of whether this component is expanded
 * @returns {JSX.Element} - HTML component for expandable extra information when emojis are clicked
 */
export default function AccordionBox({ title, children, isOpen }) {
    return (
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100 mb-4 border' : 'max-h-0 opacity-0 border-0'
          } rounded-lg border-[#1f1f1f] bg-[#111] px-5 py-0 text-sm`}
      >
        {isOpen && (
          <div className="py-5">
            {title && (
              <h4 className="mb-2 text-base font-semibold tracking-tight text-neutral-100">
                {title}
              </h4>
            )}
            <div className="leading-relaxed text-neutral-400">{children}</div>
          </div>
        )}
      </div>
    );
  }
