'use client';

export function NavbarLinks() {
  return (
    <div className="flex items-center text-sm gap-5 lg:pb-1">
      <a
        className="hover:text-primary"
        href="https://www.youtube.com/c/KeenThemesTuts/videos"
      >
        Videos
      </a>
      <a
        className="hover:text-primary"
        href="https://ticarti.com/ticarti/tailwind/docs/"
      >
        User Guides
      </a>
      <a className="hover:text-primary" href="https://devs.ticarti.com">
        Support
      </a>
    </div>
  );
}
