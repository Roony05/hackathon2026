/**
 * Shared button component for major buttons that require a load time and need to be disabled during that.
 * @param {*} children - name to be shown on the button
 * @param {*} onClick - action to be executed when clicked
 * @param {*} type - always a button in this case
 * @param {*} className - button styling
 * @param {*} disabled - disable when loading
 * @returns {JSX.Element} - HTML for button component
 */
export default function Button({ children, onClick, type = "button", className = "", disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 text-slate-900 font-semibold rounded-xl shadow-[0_0_18px_rgba(245,196,81,0.3)] hover:shadow-[0_0_28px_rgba(245,196,81,0.55)] transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}