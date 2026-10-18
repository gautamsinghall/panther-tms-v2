export default function LoadingPreviewPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-slate-500 font-mono">Loading...</span>
      </div>
    </div>
  );
}
