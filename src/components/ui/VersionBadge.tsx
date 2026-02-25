const appVersion = import.meta.env.VITE_APP_VERSION || __APP_PACKAGE_VERSION__;
const buildDate = import.meta.env.VITE_APP_BUILD_DATE;

export default function VersionBadge() {
  if (!appVersion) {
    return null;
  }

  return (
    <div className="rounded-md bg-background/60 px-2 py-1 text-[11px] leading-none text-muted-foreground/80 shadow-soft backdrop-blur-sm print:hidden">
      <span>Version: {appVersion}</span>
      {buildDate ? <span className="ml-1">- {buildDate}</span> : null}
    </div>
  );
}
