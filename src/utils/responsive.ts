import { Grid } from 'antd';

/** Below the md breakpoint counts as mobile: simple table pager, full-width modals. */
export const useIsMobile = () => {
  const screens = Grid.useBreakpoint();
  return !screens.md;
};

/** Modal width: the given width on desktop, full width with a 16px margin on mobile. */
export const useModalWidth = (desktopWidth: number | string) => {
  const isMobile = useIsMobile();
  return isMobile ? 'calc(100vw - 32px)' : desktopWidth;
};
